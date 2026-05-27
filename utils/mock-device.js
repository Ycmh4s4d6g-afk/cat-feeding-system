const today = "2026-05-27";

const status = {
  temperature: 25,
  humidity: 75,
  foodWeight: 20,
  lowFoodThreshold: 10,
  lastFeedTime: "06:00",
  petNearby: true,
  deviceOnline: true
};

const schedules = [
  { id: 1, time: "06:00", portions: 3, enabled: true },
  { id: 2, time: "18:30", portions: 2, enabled: true }
];

const trend = [
  { time: "06:00", temperature: 24, humidity: 72, foodWeight: 80 },
  { time: "09:00", temperature: 25, humidity: 75, foodWeight: 62 },
  { time: "12:00", temperature: 26, humidity: 73, foodWeight: 45 },
  { time: "15:00", temperature: 25, humidity: 74, foodWeight: 34 },
  { time: "18:00", temperature: 25, humidity: 75, foodWeight: 20 }
];

const captures = [
  {
    id: 1,
    time: `${today} 08:42`,
    type: "红外触发",
    confidence: 0.86,
    image: "/assets/cat-placeholder.png"
  },
  {
    id: 2,
    time: `${today} 12:15`,
    type: "远程拍照",
    confidence: 0.78,
    image: "/assets/cat-placeholder.png"
  }
];

function getDeviceSnapshot() {
  return {
    status,
    schedules,
    trend,
    captures
  };
}

module.exports = {
  getDeviceSnapshot
};
