// 导入 Transformers.js 的 pipeline
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

document.addEventListener('DOMContentLoaded', function () {
  // --- 加载屏幕处理 ---
  const loadingScreen = document.getElementById('loading-screen');
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    // 在动画结束后将其隐藏，以防它阻碍交互
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500); // 这个时间应该匹配 CSS 中的 transition 时间
  }, 1500); // 1.5秒后开始淡出

  // 获取需要的 DOM 元素
  let video1 = document.getElementById('video1');
  let video2 = document.getElementById('video2');
  const micButton = document.getElementById('mic-button');
  const favorabilityBar = document.getElementById('favorability-bar');
  const floatingButton = document.getElementById('floating-button');
  const menuContainer = document.getElementById('menu-container');
  const menuItems = document.querySelectorAll('.menu-item');

  // --- 情感分析元素 ---
  const sentimentInput = document.getElementById('sentiment-input');
  const analyzeButton = document.getElementById('analyze-button');
  const sentimentResult = document.getElementById('sentiment-result');

  let currentFavorability = 65; // 초기 호감도 값 (CSS와 일치)
  favorabilityBar.style.width = `${currentFavorability}%`;

  let activeVideo = video1;
  let inactiveVideo = video2;

  // 중립 영상 정의
  const neutralVideo = '视频资源/3D 建模图片制作.mp4';

  // 긍정/부정 영상 목록
  const positiveVideos = [
    '视频资源/jimeng-2025-07-16-1043-笑着优雅的左右摇晃，过一会儿手扶着下巴，保持微笑.mp4',
    '视频资源/jimeng-2025-07-16-4437-比耶，然后微笑着优雅的左右摇晃.mp4',
    '视频资源/生成加油视频.mp4',
    '视频资源/生成跳舞视频.mp4',
  ];
  const negativeVideo =
    '视频资源/负面/jimeng-2025-07-16-9418-双手叉腰，嘴巴一直在嘟囔，表情微微生气.mp4';

  // 초기 영상 재생 (중립 영상)
  activeVideo.querySelector('source').setAttribute('src', neutralVideo);
  activeVideo.load();
  activeVideo.play().catch((error) => {
    console.error('초기 중립 영상 재생 실패:', error);
  });
  activeVideo.addEventListener('ended', playNeutralVideo, { once: true }); // 중립 영상 반복 재생

  function playNeutralVideo() {
    // 현재 활성 비디오가 중립 비디오가 아니면 중립 비디오로 전환
    if (
      activeVideo.querySelector('source').getAttribute('src') !== neutralVideo
    ) {
      inactiveVideo.querySelector('source').setAttribute('src', neutralVideo);
      inactiveVideo.load();
      inactiveVideo.addEventListener(
        'canplaythrough',
        function onCanPlayThrough() {
          inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
          activeVideo.pause();
          inactiveVideo
            .play()
            .catch((error) => console.error('중립 영상 재생 실패:', error));
          activeVideo.classList.remove('active');
          inactiveVideo.classList.add('active');
          [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
          activeVideo.addEventListener('ended', playNeutralVideo, {
            once: true,
          }); // 중립 영상 반복 재생
        },
        { once: true }
      );
    } else {
      // 현재 활성 비디오가 이미 중립 비디오이면 다시 재생
      activeVideo
        .play()
        .catch((error) => console.error('중립 영상 재시작 실패:', error));
      activeVideo.addEventListener('ended', playNeutralVideo, { once: true }); // 중립 영상 반복 재생
    }
  }

  function playSpecificVideo(videoSrc) {
    const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
    if (videoSrc === currentVideoSrc) return;

    inactiveVideo.querySelector('source').setAttribute('src', videoSrc);
    inactiveVideo.load();

    inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
      inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
      activeVideo.pause();
      inactiveVideo.play().catch(error => console.error("Video play failed:", error));
      activeVideo.classList.remove('active');
      inactiveVideo.classList.add('active');
      [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
      activeVideo.addEventListener('ended', playNeutralVideo, { once: true }); // 영상 재생 후 중립 영상으로 복귀
    }, { once: true });
  }

  let classifier;
  async function performSentimentAnalysis() {
    const text = sentimentInput.value;
    if (!text) return;

    sentimentResult.textContent = '분석 중...';

    // 第一次点击时, 初始化分类器
    if (!classifier) {
      try {
        classifier = await pipeline('sentiment-analysis');
      } catch (error) {
        console.error('모델 로드 실패:', error);
        sentimentResult.textContent = '죄송합니다. 모델 로드에 실패했습니다.';
        return;
      }
    }

    // 进行情感分析
    try {
      const result = await classifier(text);
      // 显示最主要的情绪和分数
      const primaryEmotion = result[0];
      sentimentResult.textContent = `감정: ${primaryEmotion.label}, 점수: ${primaryEmotion.score.toFixed(2)}`;

      // 호감도 업데이트
      let favorabilityChange = 0;
      if (primaryEmotion.label === 'POSITIVE') {
        favorabilityChange = 5; // 긍정적인 감정일 때 호감도 5% 증가
        playSpecificVideo(positiveVideos[Math.floor(Math.random() * positiveVideos.length)]);
      } else if (primaryEmotion.label === 'NEGATIVE') {
        favorabilityChange = -5; // 부정적인 감정일 때 호감도 5% 감소
        playSpecificVideo(negativeVideo);
      } else {
        // 중립 감정일 경우 중립 영상 재생
        playNeutralVideo();
      }

      currentFavorability = Math.max(0, Math.min(100, currentFavorability + favorabilityChange));
      favorabilityBar.style.width = `${currentFavorability}%`;
    } catch (error) {
      console.error('감정 분석 실패:', error);
      sentimentResult.textContent = '분석 중 오류가 발생했습니다.';
    }
  }

  analyzeButton.addEventListener('click', performSentimentAnalysis);

  sentimentInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      performSentimentAnalysis();
    }
  });
});
