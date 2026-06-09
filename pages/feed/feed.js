const { getDeviceSnapshot } = require("../../utils/mock-device");
const {
  PORTION_SECONDS,
  getDeviceStatus,
  getFeedSchedules,
  manualFeed,
  normalizeSchedule,
  normalizeStatus
} = require("../../utils/api.js");

Page({
  data: {
    status: {},
    schedules: [],
    manualPortions: 1,
    newTime: "20:00",
    newPortions: 2
  },

  onLoad() {
    const { status, schedules } = getDeviceSnapshot();
    this.setData({ status, schedules: schedules.map((item) => ({ ...item })) });
    this.loadFeedData();
  },

  onShow() {
    this.loadFeedData();
  },

  loadFeedData() {
    const fallbackStatus = this.data.status;

    Promise.all([
      getDeviceStatus().catch((err) => {
        console.error("device status failed:", err);
        return null;
      }),
      getFeedSchedules().catch((err) => {
        console.error("feed schedules failed:", err);
        return null;
      })
    ]).then(([statusData, schedulesData]) => {
      const nextData = {};

      if (statusData) {
        nextData.status = normalizeStatus(statusData, fallbackStatus);
      }

      if (Array.isArray(schedulesData)) {
        nextData.schedules = schedulesData.map(normalizeSchedule);
      }

      this.setData(nextData);
    });
  },

  minusPortion() {
    this.setData({ manualPortions: Math.max(1, this.data.manualPortions - 1) });
  },

  plusPortion() {
    this.setData({ manualPortions: Math.min(6, this.data.manualPortions + 1) });
  },

  minusSchedulePortion() {
    this.setData({ newPortions: Math.max(1, this.data.newPortions - 1) });
  },

  plusSchedulePortion() {
    this.setData({ newPortions: Math.min(6, this.data.newPortions + 1) });
  },

  onTimeChange(event) {
    this.setData({ newTime: event.detail.value });
  },

  sendManualFeed() {
    const duration = this.data.manualPortions * PORTION_SECONDS;

    manualFeed(duration)
      .then(() => {
        wx.showToast({
          title: "已发送",
          icon: "success"
        });
        this.loadFeedData();
      })
      .catch((err) => {
        console.error("manual feed failed:", err);
        wx.showToast({ title: "发送失败", icon: "none" });
      });
  },

  addSchedule() {
    const next = {
      id: Date.now(),
      time: this.data.newTime,
      portions: this.data.newPortions,
      durationSeconds: this.data.newPortions * PORTION_SECONDS,
      enabled: true
    };
    this.setData({ schedules: [...this.data.schedules, next] });
    wx.showToast({ title: "计划已添加", icon: "success" });
  },

  toggleSchedule(event) {
    const id = event.currentTarget.dataset.id;
    const schedules = this.data.schedules.map((item) => (
      item.id === id ? { ...item, enabled: event.detail.value } : item
    ));
    this.setData({ schedules });
  }
});
