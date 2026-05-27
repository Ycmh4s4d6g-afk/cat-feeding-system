const { getDeviceSnapshot } = require("../../utils/mock-device");

Page({
  data: {
    selectedDate: "2026-05-27",
    trend: [],
    records: []
  },

  onLoad() {
    const { trend } = getDeviceSnapshot();
    this.setData({
      trend,
      records: [
        { time: "06:00", text: "自动喂食 3 份" },
        { time: "08:42", text: "检测到猫咪经过" },
        { time: "12:15", text: "远程拍照成功" },
        { time: "18:00", text: "余量低于 20g" }
      ]
    });
  },

  onDateChange(event) {
    this.setData({ selectedDate: event.detail.value });
  }
});
