export const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const generateData = () => {
  let basePrice = 3;
  const candleData = [];
  const lineData = [];
  const volumeData = [];
  let currentDate = new Date('2023-01-01');
  let seed = 42;

  for (let i = 0; i < 800; i++) {
    const open = basePrice + (seededRandom(seed++) * 40 - 20);
    const close = open + (seededRandom(seed++) * 60 - 30);
    const high = Math.max(open, close) + seededRandom(seed++) * 20;
    const low = Math.min(open, close) - seededRandom(seed++) * 20;
    const volume = Math.floor(seededRandom(seed++) * 5000) + 1000;
    const isUp = close >= open;

    const time = currentDate.toISOString().split('T')[0];

    candleData.push({ time, open, high, low, close });
    lineData.push({ time, value: close });
    volumeData.push({ 
      time, 
      value: volume, 
      color: isUp ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)' 
    });

    basePrice = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return { candleData, lineData, volumeData };
};

export const { candleData, lineData, volumeData } = generateData();
export const currentPrice = candleData[candleData.length - 1].close;
