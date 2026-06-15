const { getDeviceSnapshot } = require("../../utils/mock-device");
const {
  getFeedRecords,
  getDeviceStatus,
  getSensorHistory,
  normalizeHistory,
  normalizeRecord,
  normalizeStatus
} = require("../../utils/api.js");

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

Page({
  data: {
    selectedDate: today(),
    startTime: "00:00",
    endTime: "23:59",
    chartStartLabel: "",
    chartEndLabel: "",
    trend: [],
    weatherStats: {
      latestTemperature: "--",
      latestHumidity: "--"
    },
    foodStats: {
      latestFoodWeight: "--"
    },
    records: []
  },
  historyRequestId: 0,

  onLoad() {
    const { trend } = getDeviceSnapshot();
    this.setData({
      trend,
      weatherStats: this.getWeatherStats(trend),
      foodStats: this.getFoodStats(trend),
      records: [
        { time: "06:00", text: "自动喂食 3 份" },
        { time: "08:42", text: "检测到猫咪经过" },
        { time: "12:15", text: "远程拍照成功" },
        { time: "18:00", text: "余量低于 20g" }
      ]
    }, this.refreshCharts);
    this.loadData();
  },

  onReady() {
    this.refreshCharts();
  },

  loadData(params = { hours: 24 }) {
    const requestId = this.historyRequestId + 1;
    const chartLabels = this.getChartLabels(params);
    this.historyRequestId = requestId;
    this.setData(Object.assign({ trend: [] }, chartLabels), this.refreshCharts);

    Promise.all([
      getSensorHistory(params).catch((err) => {
        console.error("sensor history failed:", err);
        return null;
      }),
      getFeedRecords({ limit: 50 }).catch((err) => {
        console.error("feed records failed:", err);
        return null;
      }),
      getDeviceStatus().catch((err) => {
        console.error("device status failed:", err);
        return null;
      })
    ]).then(([historyData, recordsData, statusData]) => {
      if (requestId !== this.historyRequestId) {
        return;
      }

      const nextData = {};

      if (historyData) {
        nextData.trend = normalizeHistory(historyData);
        nextData.weatherStats = this.getWeatherStats(nextData.trend);
        nextData.foodStats = this.getFoodStats(nextData.trend);
      }

      if (statusData) {
        const status = normalizeStatus(statusData, {});
        nextData.foodStats = {
          latestFoodWeight: this.formatNumber(status.foodWeight)
        };
      }

      if (Array.isArray(recordsData)) {
        nextData.records = recordsData.map(normalizeRecord);
      }

      this.setData(Object.assign(nextData, chartLabels), this.refreshCharts);
    });
  },

  onDateChange(event) {
    this.setData({ selectedDate: event.detail.value });
  },

  onStartTimeChange(event) {
    this.setData({ startTime: event.detail.value });
  },

  onEndTimeChange(event) {
    this.setData({ endTime: event.detail.value });
  },

  applyTimeFilter() {
    const startTime = `${this.data.selectedDate} ${this.data.startTime}:00`;
    const endTime = `${this.data.selectedDate} ${this.data.endTime}:59`;

    if (startTime > endTime) {
      wx.showToast({ title: "结束时间需晚于开始时间", icon: "none" });
      return;
    }

    this.loadData({
      start_time: startTime,
      end_time: endTime
    });
  },

  resetToLast24Hours() {
    this.loadData({ hours: 24 });
  },

  refreshCharts() {
    wx.nextTick(() => {
      setTimeout(() => {
        this.drawWeatherChart();
        this.drawFoodChart();
      }, 30);
    });
  },

  getChartLabels(params = {}) {
    if (params.start_time && params.end_time) {
      return {
        chartStartLabel: params.start_time.slice(11, 16),
        chartEndLabel: params.end_time.slice(11, 16)
      };
    }

    return {
      chartStartLabel: "",
      chartEndLabel: ""
    };
  },

  getWeatherStats(trend = []) {
    const latest = trend[trend.length - 1] || {};

    return {
      latestTemperature: this.formatNumber(latest.temperature),
      latestHumidity: this.formatNumber(latest.humidity)
    };
  },

  getFoodStats(trend = []) {
    const latest = trend[trend.length - 1] || {};

    return {
      latestFoodWeight: this.formatNumber(latest.foodWeight)
    };
  },

  formatNumber(value) {
    const number = Number(value);
    return Number.isNaN(number) ? "--" : number.toFixed(1);
  },

  sampleTrend(trend, maxPoints = 80) {
    if (trend.length <= maxPoints) {
      return trend;
    }

    const step = Math.ceil(trend.length / maxPoints);
    return trend.filter((_, index) => index % step === 0 || index === trend.length - 1);
  },

  getPointY(value, min, max, top, height) {
    if (max === min) {
      return top + height / 2;
    }

    return top + (1 - (value - min) / (max - min)) * height;
  },

  getRange(values) {
    const validValues = values.filter((value) => !Number.isNaN(value));

    if (!validValues.length) {
      return { min: 0, max: 1 };
    }

    const minValue = Math.min.apply(null, validValues);
    const maxValue = Math.max.apply(null, validValues);
    const rangePadding = Math.max(0.5, (maxValue - minValue) * 0.12);

    return {
      min: minValue - rangePadding,
      max: maxValue + rangePadding
    };
  },

  drawLine(ctx, points, color) {
    if (!points.length) {
      return;
    }

    ctx.beginPath();
    ctx.setStrokeStyle(color);
    ctx.setLineWidth(2.5);
    ctx.setLineJoin("round");
    ctx.setLineCap("round");

    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
        return;
      }

      ctx.lineTo(point.x, point.y);
    });

    ctx.stroke();
  },

  drawWeatherChart() {
    const trend = this.sampleTrend(this.data.trend || []);
    const query = wx.createSelectorQuery().in(this);

    query.select("#weatherChart").boundingClientRect((rect) => {
      if (!rect || !rect.width || !rect.height) {
        return;
      }

      const ctx = wx.createCanvasContext("weatherChart", this);
      const width = rect.width;
      const height = rect.height;
      const padding = { top: 22, right: 18, bottom: 34, left: 34 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);
      ctx.setFillStyle("#fffaf4");
      ctx.fillRect(0, 0, width, height);

      ctx.setStrokeStyle("#eadfd4");
      ctx.setLineWidth(1);
      for (let i = 0; i <= 4; i += 1) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      if (!trend.length) {
        ctx.setFillStyle("#766d63");
        ctx.setFontSize(13);
        ctx.setTextAlign("center");
        ctx.fillText("暂无温湿度数据", width / 2, height / 2);
        ctx.draw();
        return;
      }

      const temperatures = trend.map((item) => Number(item.temperature));
      const humidities = trend.map((item) => Number(item.humidity));
      const temperatureRange = this.getRange(temperatures);
      const humidityRange = this.getRange(humidities);
      const denominator = Math.max(1, trend.length - 1);
      const temperaturePoints = [];
      const humidityPoints = [];

      trend.forEach((item, index) => {
        const x = padding.left + (chartWidth / denominator) * index;
        const temperature = Number(item.temperature);
        const humidity = Number(item.humidity);

        if (!Number.isNaN(temperature)) {
          temperaturePoints.push({
            x,
            y: this.getPointY(temperature, temperatureRange.min, temperatureRange.max, padding.top, chartHeight)
          });
        }

        if (!Number.isNaN(humidity)) {
          humidityPoints.push({
            x,
            y: this.getPointY(humidity, humidityRange.min, humidityRange.max, padding.top, chartHeight)
          });
        }
      });

      this.drawLine(ctx, temperaturePoints, "#cf5c36");
      this.drawLine(ctx, humidityPoints, "#1f8a70");

      ctx.setFillStyle("#766d63");
      ctx.setFontSize(10);
      ctx.setTextAlign("left");
      ctx.fillText(String(this.data.chartStartLabel || trend[0].time || ""), padding.left, height - 12);
      ctx.setTextAlign("right");
      ctx.fillText(String(this.data.chartEndLabel || trend[trend.length - 1].time || ""), width - padding.right, height - 12);

      ctx.draw();
    }).exec();
  },

  drawFoodChart() {
    const trend = this.sampleTrend(this.data.trend || []);
    const query = wx.createSelectorQuery().in(this);

    query.select("#foodChart").boundingClientRect((rect) => {
      if (!rect || !rect.width || !rect.height) {
        return;
      }

      const ctx = wx.createCanvasContext("foodChart", this);
      const width = rect.width;
      const height = rect.height;
      const padding = { top: 22, right: 18, bottom: 34, left: 34 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);
      ctx.setFillStyle("#fffaf4");
      ctx.fillRect(0, 0, width, height);

      ctx.setStrokeStyle("#eadfd4");
      ctx.setLineWidth(1);
      for (let i = 0; i <= 4; i += 1) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      if (!trend.length) {
        ctx.setFillStyle("#766d63");
        ctx.setFontSize(13);
        ctx.setTextAlign("center");
        ctx.fillText("暂无余量数据", width / 2, height / 2);
        ctx.draw();
        return;
      }

      const foodWeights = trend.map((item) => Number(item.foodWeight));
      const foodRange = this.getRange(foodWeights);
      const denominator = Math.max(1, trend.length - 1);
      const foodPoints = [];

      trend.forEach((item, index) => {
        const x = padding.left + (chartWidth / denominator) * index;
        const foodWeight = Number(item.foodWeight);

        if (!Number.isNaN(foodWeight)) {
          foodPoints.push({
            x,
            y: this.getPointY(foodWeight, foodRange.min, foodRange.max, padding.top, chartHeight)
          });
        }
      });

      this.drawLine(ctx, foodPoints, "#1f8a70");

      ctx.setFillStyle("#766d63");
      ctx.setFontSize(10);
      ctx.setTextAlign("left");
      ctx.fillText(String(this.data.chartStartLabel || trend[0].time || ""), padding.left, height - 12);
      ctx.setTextAlign("right");
      ctx.fillText(String(this.data.chartEndLabel || trend[trend.length - 1].time || ""), width - padding.right, height - 12);

      ctx.draw();
    }).exec();
  }
});
