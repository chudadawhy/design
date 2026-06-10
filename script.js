// ─── SNS별 검색 키워드 설정 ─────────────────────────────────────
const SNS_CONFIG = {
  facebook:  { label: 'Facebook',  query: 'Facebook SNS 트렌드',  lang: 'ko' },
  instagram: { label: 'Instagram', query: 'Instagram 릴스 트렌드', lang: 'ko' },
  youtube:   { label: 'YouTube',   query: 'YouTube 유튜브 쇼츠',   lang: 'ko' },
  threads:   { label: 'Threads',   query: 'Threads 스레드 SNS',    lang: 'ko' },
  x:         { label: 'X Twitter', query: 'X Twitter 트위터 트렌드', lang: 'ko' },
};

// ─── 날짜 표시 ────────────────────────────────────────────────────
function setTodayDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
  document.getElementById('today-date').textContent =
    now.toLocaleDateString('ko-KR', options);
}

// ─── Scroll Fade-in (IntersectionObserver) ───────────────────────
function initScrollAnimation() {
  const cards = document.querySelectorAll('.sns-card');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  cards.forEach(c => observer.observe(c));
}

// ─── Mouse Spotlight Effect (Desktop) ────────────────────────────
function initSpotlight() {
  if (window.matchMedia('(max-width: 768px)').matches) return;
  const glowMap = {
    facebook:  'rgba(24,119,242,0.07)',
    instagram: 'rgba(225,48,108,0.07)',
    youtube:   'rgba(255,0,0,0.07)',
    threads:   'rgba(255,255,255,0.05)',
    x:         'rgba(231,233,234,0.05)',
  };
  document.querySelectorAll('.sns-card').forEach(card => {
    const sns = card.dataset.sns;
    card.addEventListener('mousemove', e => {
      const { left, top } = card.getBoundingClientRect();
      const x = e.clientX - left, y = e.clientY - top;
      card.style.background =
        `radial-gradient(circle at ${x}px ${y}px, ${glowMap[sns]}, rgba(22,30,50,0.55) 45%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });
}

// ─── 상태바 헬퍼 ──────────────────────────────────────────────────
function setStatus(msg, type = 'loading') {
  const bar = document.getElementById('status-bar');
  bar.textContent = msg;
  bar.className = `status-bar ${type}`;
}
function clearStatus() {
  document.getElementById('status-bar').className = 'status-bar hidden';
}

// ─── 로딩 스켈레톤 표시 ──────────────────────────────────────────
function showSkeletons() {
  Object.keys(SNS_CONFIG).forEach(key => {
    const section = document.getElementById(`trends-${key}`);
    const list    = document.getElementById(`news-${key}`);
    section.classList.remove('hidden');
    list.innerHTML = Array(4).fill(
      `<li><div class="news-skeleton" style="width:${60 + Math.random()*30}%"></div></li>`
    ).join('');
  });
}

// ─── 뉴스 렌더링 ─────────────────────────────────────────────────
function renderNews(key, articles) {
  const list = document.getElementById(`news-${key}`);
  const timeEl = document.getElementById(`time-${key}`);
  const now = new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' });

  if (!articles || articles.length === 0) {
    list.innerHTML = '<li style="color:var(--muted);font-size:0.88rem">수집된 뉴스가 없습니다.</li>';
    timeEl.textContent = `(${now} 업데이트)`;
    return;
  }
  timeEl.textContent = `(${now} 업데이트)`;
  list.innerHTML = articles.slice(0, 6).map(a => `
    <li>
      <span class="news-dot"></span>
      <a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.title}</a>
    </li>
  `).join('');
}

// ─── GNews API 호출 ───────────────────────────────────────────────
async function fetchForSns(key, apiKey) {
  const { query, lang } = SNS_CONFIG[key];
  const url =
    `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=6&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.articles || [];
}

// ─── 메인 트렌드 수집 함수 ───────────────────────────────────────
async function fetchTrends() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  if (!apiKey) {
    setStatus('⚠️  GNews API 키를 입력해주세요. gnews.io에서 무료 발급 가능합니다.', 'error');
    return;
  }

  // UI: 버튼 로딩 상태
  const btn = document.getElementById('fetch-btn');
  btn.classList.add('loading');
  btn.disabled = true;
  setStatus('⏳  각 SNS별 최신 뉴스를 수집 중입니다...', 'loading');
  showSkeletons();

  const keys  = Object.keys(SNS_CONFIG);
  const results = {};
  const errors  = [];

  // 순차 요청 (무료 API rate limit 배려)
  for (const key of keys) {
    try {
      results[key] = await fetchForSns(key, apiKey);
      await delay(400); // 과도한 요청 방지
    } catch (err) {
      errors.push(key);
      results[key] = [];
      console.warn(`[${key}] 뉴스 수집 실패:`, err.message);
    }
  }

  // 결과 렌더링
  keys.forEach(key => renderNews(key, results[key]));

  // 완료 상태 표시
  if (errors.length === 0) {
    setStatus(`✅  모든 SNS 트렌드 수집 완료! (${new Date().toLocaleTimeString('ko-KR')})`, 'success');
  } else {
    setStatus(`⚠️  일부 수집 실패 (${errors.map(k => SNS_CONFIG[k].label).join(', ')}). API 키 또는 한도를 확인해주세요.`, 'error');
  }

  btn.classList.remove('loading');
  btn.disabled = false;

  // 3초 뒤 상태바 자동 숨김
  setTimeout(clearStatus, 6000);
}

// ─── 유틸: 딜레이 ────────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 초기화 ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  initScrollAnimation();
  initSpotlight();
});
