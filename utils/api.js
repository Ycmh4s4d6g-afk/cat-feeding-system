const { BASE_URL, get, post } = require("./request.js");

const WS_URL = BASE_URL.replace(/^http/, "ws");
const LOW_FOOD_THRESHOLD = 10;
const PORTION_SECONDS = 5;

function padTime(value) {
  return String(value).padStart(2, "0");
}

function scheduleTime(item = {}) {
  if (item.time) {
    return item.time;
  }

  return `${padTime(item.hour || 0)}:${padTime(item.minute || 0)}`;
}

function durationToPortions(duration) {
  const seconds = Number(duration) || PORTION_SECONDS;
  return Math.max(1, Math.round(seconds / PORTION_SECONDS));
}

function normalizeStatus(data = {}, fallback = {}) {
  return {
    temperature: data.temperature !== undefined ? data.temperature : fallback.temperature,
    humidity: data.humidity !== undefined ? data.humidity : fallback.humidity,
    foodWeight: data.food_weight !== undefined ? data.food_weight : (
      data.weight !== undefined ? data.weight : fallback.foodWeight
    ),
    lowFoodThreshold: fallback.lowFoodThreshold || LOW_FOOD_THRESHOLD,
    lastFeedTime: data.last_update || fallback.lastFeedTime || "--",
    petNearby: data.ir_detected !== undefined ? data.ir_detected : fallback.petNearby,
    deviceOnline: data.online !== undefined ? data.online : (
      fallback.deviceOnline !== undefined ? fallback.deviceOnline : true
    ),
    feederStatus: data.feeder_status || fallback.feederStatus || "OFF"
  };
}

function normalizeSchedule(item = {}) {
  return {
    id: item.id,
    time: scheduleTime(item),
    portions: durationToPortions(item.duration_seconds),
    durationSeconds: item.duration_seconds || PORTION_SECONDS,
    enabled: item.enabled !== false
  };
}

function normalizeHistory(data = {}) {
  const times = data.time || [];

  return times.map((time, index) => ({
    time,
    temperature: data.temperature ? data.temperature[index] : 0,
    humidity: data.humidity ? data.humidity[index] : 0,
    foodWeight: data.weight ? data.weight[index] : 0,
    irDetected: data.ir_detected ? data.ir_detected[index] : false
  }));
}

function feedTypeLabel(type) {
  if (type === "manual") {
    return "手动喂食";
  }

  if (type === "schedule") {
    return "定时喂食";
  }

  return type || "喂食";
}

function normalizeRecord(item = {}) {
  return {
    id: item.id,
    time: item.created_at ? item.created_at.slice(11, 16) : "--:--",
    text: `${feedTypeLabel(item.feed_type)} ${item.duration_seconds || 0}s`
  };
}

function getDeviceStatus() {
  return get("/api/device/status");
}

function getRealtimeData() {
  return get("/api/data");
}

function getSensorHistory(params = {}) {
  return get("/api/sensor/history", params);
}

function manualFeed(duration) {
  return post("/api/feed/manual", { duration });
}

function getFeedSchedules() {
  return get("/api/feed/schedules");
}

function getFeedRecords(params = {}) {
  return get("/api/feed/records", params);
}

function getAlerts() {
  return get("/api/alerts");
}

function sendCommand(command) {
  return post("/api/command", { command });
}

function connectRealtimeSocket(onMessage) {
  const socket = wx.connectSocket({ url: WS_URL });

  socket.onMessage((res) => {
    try {
      onMessage(JSON.parse(res.data));
    } catch (err) {
      console.error("socket message parse failed:", err);
    }
  });

  return socket;
}

module.exports = {
  BASE_URL,
  WS_URL,
  PORTION_SECONDS,
  normalizeStatus,
  normalizeSchedule,
  normalizeHistory,
  normalizeRecord,
  getDeviceStatus,
  getRealtimeData,
  getSensorHistory,
  manualFeed,
  getFeedSchedules,
  getFeedRecords,
  getAlerts,
  sendCommand,
  connectRealtimeSocket
};
