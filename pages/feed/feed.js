const { getDeviceSnapshot } = require("../../utils/mock-device");

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
    wx.showToast({
      title: `${this.data.manualPortions}份指令已发送`,
      icon: "success"
    });
  },

  addSchedule() {
    const next = {
      id: Date.now(),
      time: this.data.newTime,
      portions: this.data.newPortions,
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
