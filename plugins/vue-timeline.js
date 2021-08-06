import Vue from 'vue'
import TimelinesChart from 'timelines-chart'

import { timeFormat as d3TimeFormat } from 'd3-time-format'
import { scaleOrdinal as d3ScaleOrdinal } from 'd3-scale'
// import { schemeCategory10, schemeSet3 } from 'd3-scale-chromatic'

const dateTimeFormat = '%A %H:%M:%S'
const formatDateTime = d3TimeFormat(dateTimeFormat)

Vue.component('TimelinesChart', {
  name: 'TimelinesChart',
  methods: {
    chart(cdata) {
      const el = document.getElementById('timelines-chart-id')
      while (el.firstChild) {
        el.removeChild(el.firstChild)
      }
      const chart = TimelinesChart()
      chart
        .data(cdata)
        .timeFormat(dateTimeFormat)
        // .maxHeight(640)
        .width(el.offsetWidth)
        .maxLineHeight(24)
        .leftMargin(100)
        .rightMargin(100)
        .zQualitative(true)
        .onSegmentClick((d) => {
          const win = window.open(d.data.linkUrl, '_blank')
          win.focus()
        })
        .segmentTooltipContent((d) => {
          const duration = ((d.timeRange[1] - d.timeRange[0]) / 1000 / 60) | 0
          const avg = d.data.avgDuration
          const rankPercent = (
            (((d.timeRange[1] - d.timeRange[0]) / 1000 - avg) * 100) /
            avg
          ).toLocaleString('en-US', { minimumFractionDigits: 1 })

          return (
            '<strong> ' +
            `${duration} Min. (${rankPercent}%)` +
            ' </strong>' +
            '<br>' +
            '<strong>From: </strong>' +
            formatDateTime(d.timeRange[0]) +
            '<br>' +
            '<strong>To: </strong>' +
            formatDateTime(d.timeRange[1])
          )
        })
        .zColorScale(
          d3ScaleOrdinal()
            .domain(['running', 'succeeded', 'failed', 'failed-with-retry'])
            .range(['#008000', '#0000ff', '#FF0000', '#FFFF00'])
        )(el)
    },
  },
  template: '<span/>',
})
