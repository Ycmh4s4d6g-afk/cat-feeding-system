const { getDeviceSnapshot } = require("../../utils/mock-device");
const {
  createFeedSchedule,
  deleteFeedSchedule,
  getDeviceStatus,
  getFeedRecords,
  getFeedSchedules,
  normalizeRecord,
  normalizeSchedule,
  normalizeStatus,
  updateFeedSchedule
} = require("../../utils/api.js");

Page({
  data: {
    status: {},
    schedules: [],
    records: [],
    newTime: "20:00",
    newPortions: 2,
    scheduleSaving: false,
    updatingScheduleId: null
  },

  onLoad() {
    const { status, schedules } = getDeviceSnapshot();
    this.setData({
      status,
      schedules: schedules.map((item) => ({ ...item }))
    });
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
      }),
      getFeedRecords({ limit: 50 }).catch((err) => {
        console.error("feed records failed:", err);
        return null;
      })
    ]).then(([statusData, schedulesData, recordsData]) => {
      const nextData = {};

      if (statusData) {
        nextData.status = normalizeStatus(statusData, fallbackStatus);
      }

      if (Array.isArray(schedulesData)) {
        nextData.schedules = schedulesData.map(normalizeSchedule);
      }

      if (Array.isArray(recordsData)) {
        nextData.records = recordsData.map(normalizeRecord);
      }

      this.setData(nextData);
    });
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

  addSchedule() {
    if (this.data.scheduleSaving) {
      return;
    }

    const [hour, minute] = this.data.newTime.split(":").map(Number);

    this.setData({ scheduleSaving: true });
    createFeedSchedule({
      hour,
      minute,
      portions: this.data.newPortions
    })
      .then(() => {
        wx.showToast({ title: "计划已添加", icon: "success" });
        this.loadFeedData();
      })
      .catch((err) => {
        console.error("add schedule failed:", err);
        wx.showToast({ title: "添加失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ scheduleSaving: false });
      });
  },

  toggleSchedule(event) {
    const id = Number(event.currentTarget.dataset.id);
    const enabled = event.detail.value;

    this.setData({ updatingScheduleId: id });
    updateFeedSchedule(id, enabled)
      .then(() => {
        wx.showToast({ title: enabled ? "已启用" : "已禁用", icon: "success" });
        this.loadFeedData();
      })
      .catch((err) => {
        console.error("toggle schedule failed:", err);
        wx.showToast({ title: "更新失败", icon: "none" });
        this.loadFeedData();
      })
      .finally(() => {
        this.setData({ updatingScheduleId: null });
      });
  },

  deleteSchedule(event) {
    const id = Number(event.currentTarget.dataset.id);

    if (this.data.updatingScheduleId === id) {
      return;
    }

    wx.showModal({
      title: "删除计划",
      content: "确定删除这条喂食计划吗？",
      confirmText: "删除",
      confirmColor: "#cf5c36",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        this.setData({ updatingScheduleId: id });
        deleteFeedSchedule(id)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.loadFeedData();
          })
          .catch((err) => {
            console.error("delete schedule failed:", err);
            wx.showToast({ title: "删除失败", icon: "none" });
          })
          .finally(() => {
            this.setData({ updatingScheduleId: null });
          });
      }
    });
  }
});
