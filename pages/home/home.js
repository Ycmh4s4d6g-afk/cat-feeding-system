const { getDeviceSnapshot } = require("../../utils/mock-device");
const {
  getAlerts,
  getDeviceStatus,
  getThresholds,
  normalizeStatus,
  resetThresholds,
  sendCommand,
  updateLowFoodThreshold,
  updateTempHighThreshold
} = require("../../utils/api.js");

function normalizeAlert(item = {}) {
  return {
    id: item.id,
    title: item.alert_type || "设备告警",
    message: item.message || "设备状态异常，请及时检查。",
    time: item.created_at || ""
  };
}

function findThreshold(data, code) {
  const source = data && data.data ? data.data : data;

  if (source && !Array.isArray(source) && typeof source === "object") {
    return source[code] || {};
  }

  const list = Array.isArray(source) ? source : [];
  return list.find((item) => item.code === code || item.name === code || item.threshold_type === code) || {};
}

function getThresholdValue(item = {}, field, fallback) {
  const value = item[field] !== undefined ? item[field] : item.value;
  return value !== undefined && value !== null ? String(value) : String(fallback);
}

Page({
  data: {
    status: {},
    alert: null,
    feederSwitching: false,
    feederEnabled: false,
    thresholdForm: {
      lowFoodMax: "100",
      tempHighMin: "35"
    },
    thresholdSaving: false
  },

  onLoad() {
    const { status } = getDeviceSnapshot();
    this.setData({ status });
    this.loadDeviceData();
    this.loadThresholds();
  },

  onShow() {
    this.loadDeviceData();
  },

  loadDeviceData() {
    const fallbackStatus = this.data.status;

    Promise.all([
      getDeviceStatus().catch((err) => {
        console.error("device status failed:", err);
        return null;
      }),
      getAlerts().catch((err) => {
        console.error("alerts failed:", err);
        return null;
      })
    ]).then(([statusData, alertsData]) => {
      const nextData = {};
      const nextStatus = statusData ? normalizeStatus(statusData, fallbackStatus) : fallbackStatus;

      if (statusData) {
        nextData.status = nextStatus;
      }

      if (Array.isArray(alertsData) && alertsData.length) {
        const unreadAlert = alertsData.find((item) => item.is_read === false);
        nextData.alert = normalizeAlert(unreadAlert || alertsData[0]);
      } else if (Number(nextStatus.foodWeight) <= Number(nextStatus.lowFoodThreshold)) {
        nextData.alert = {
          title: "猫粮余量不足",
          message: `已低于 ${nextStatus.lowFoodThreshold}g，请补充猫粮。系统会暂停自动出粮，避免空转。`,
          time: ""
        };
      } else {
        nextData.alert = null;
      }

      this.setData(nextData);
    });
  },

  loadThresholds() {
    getThresholds()
      .then((data) => {
        const lowFood = findThreshold(data, "LOW_FOOD");
        const tempHigh = findThreshold(data, "TEMP_HIGH");

        this.setData({
          thresholdForm: {
            lowFoodMax: getThresholdValue(lowFood, "max_value", this.data.thresholdForm.lowFoodMax),
            tempHighMin: getThresholdValue(tempHigh, "min_value", this.data.thresholdForm.tempHighMin)
          }
        });
      })
      .catch((err) => {
        console.error("thresholds failed:", err);
      });
  },

  onLowFoodChange(event) {
    this.setData({ "thresholdForm.lowFoodMax": event.detail.value });
  },

  onTempHighChange(event) {
    this.setData({ "thresholdForm.tempHighMin": event.detail.value });
  },

  saveThresholds() {
    const lowFoodMax = Number(this.data.thresholdForm.lowFoodMax);
    const tempHighMin = Number(this.data.thresholdForm.tempHighMin);

    if (Number.isNaN(lowFoodMax) || Number.isNaN(tempHighMin)) {
      wx.showToast({ title: "请输入有效数字", icon: "none" });
      return;
    }

    this.setData({ thresholdSaving: true });
    Promise.all([
      updateLowFoodThreshold(lowFoodMax),
      updateTempHighThreshold(tempHighMin)
    ])
      .then(() => {
        wx.showToast({ title: "阈值已保存", icon: "success" });
        this.loadThresholds();
      })
      .catch((err) => {
        console.error("save thresholds failed:", err);
        wx.showToast({ title: "保存失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ thresholdSaving: false });
      });
  },

  resetThresholdSettings() {
    this.setData({ thresholdSaving: true });
    resetThresholds()
      .then(() => {
        wx.showToast({ title: "已重置", icon: "success" });
        this.loadThresholds();
      })
      .catch((err) => {
        console.error("reset thresholds failed:", err);
        wx.showToast({ title: "重置失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ thresholdSaving: false });
      });
  },

  toggleFeeder() {
    if (this.data.feederSwitching) {
      return;
    }

    const isOn = this.data.feederEnabled;
    const command = isOn ? "0" : "1";

    this.setData({ feederSwitching: true });
    sendCommand(command)
      .then(() => {
        this.setData({ feederEnabled: !isOn });
        wx.showToast({ title: isOn ? "已关闭" : "已开启", icon: "success" });
        this.loadDeviceData();
      })
      .catch((err) => {
        console.error("feeder command failed:", err);
        wx.showToast({ title: "控制失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ feederSwitching: false });
      });
  },

  feedNow() {
    wx.showModal({
      title: "确认喂食",
      content: "将远程打开喂食器。",
      confirmText: "喂食",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        sendCommand("1")
          .then(() => {
            this.setData({ "status.feederStatus": "ON" });
            wx.showToast({ title: "已发送", icon: "success" });
            this.loadDeviceData();
          })
          .catch((err) => {
            console.error("feed command failed:", err);
            wx.showToast({ title: "发送失败", icon: "none" });
          });
      }
    });
  },

  goCamera() {
    wx.switchTab({ url: "/pages/camera/camera" });
  }
});
