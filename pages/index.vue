<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="2">
        <v-select
          v-model="selectedProject"
          :items="projects"
          label="Project"
        ></v-select>
      </v-col>
      <v-col cols="2">
        <v-menu
          v-model="endDateMenu"
          :close-on-content-click="false"
          :nudge-right="40"
          transition="scale-transition"
          offset-y
          min-width="290px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-text-field
              v-model="endDate"
              label="End Date"
              prepend-icon="mdi-calendar"
              readonly
              v-bind="attrs"
              v-on="on"
            ></v-text-field>
          </template>
          <v-date-picker
            v-model="endDate"
            @input="endDateMenu = false"
          ></v-date-picker>
        </v-menu>
      </v-col>
      <v-col cols="2">
        <v-menu
          ref="menu"
          v-model="endTimeMenu"
          :close-on-content-click="false"
          :nudge-right="40"
          :return-value.sync="endTime"
          transition="scale-transition"
          offset-y
          max-width="290px"
          min-width="290px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-text-field
              v-model="endTime"
              label="End Time"
              prepend-icon="mdi-clock-time-four-outline"
              readonly
              v-bind="attrs"
              v-on="on"
            ></v-text-field>
          </template>
          <v-time-picker
            v-if="endTimeMenu"
            v-model="endTime"
            format="24hr"
            full-width
            @click:minute="$refs.menu.save(endTime)"
          ></v-time-picker>
        </v-menu>
      </v-col>
      <v-col cols="3" class="d-flex align-end">
        <v-slider
          v-model="lookback"
          label="Lookback Hours"
          max="24"
          min="1"
          thumb-label="always"
        ></v-slider>
      </v-col>
      <v-col cols="2" class="d-flex justify-center align-start">
        <v-btn color="deep-purple accent-4" @click="loadExecutions">
          Load Executions
        </v-btn>
      </v-col>
    </v-row>
    <v-row v-if="hasData()" justify="center">
      <v-col cols="3">
        <v-select
          v-model="filter.group"
          :items="jobs.groups"
          label="Group"
          hint="Choose a job group"
          persistent-hint
          @change="showExecutions"
        ></v-select>
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="filter.name"
          :items="getJobsInGroup()"
          label="Job"
          hint="Choose a job"
          persistent-hint
          @change="showExecutions"
        ></v-select>
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="filter.status"
          :items="jobs.statuses"
          label="Status"
          hint="Choose a job status"
          persistent-hint
          @change="showExecutions"
        ></v-select>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <client-only placeholder="Loading...">
          <div id="timelines-chart-id" />
          <timelines-chart ref="tl" />
        </client-only>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from 'axios'
import moment from 'moment'

const convertNode = (raw) => {
  const groupMap = new Map()
  raw.forEach((r) => {
    let labelMap = groupMap.get(r.job.group)
    if (!labelMap) {
      labelMap = new Map()
      groupMap.set(r.job.group, labelMap)
    }
    let jobAry = labelMap.get(r.job.name)
    if (!jobAry) {
      jobAry = []
      labelMap.set(r.job.name, jobAry)
    }

    r.status = r['date-ended'] ? r.status : 'running'
    const startDt = r['date-started'].date
    const endDt = r['date-ended'] ? r['date-ended'].date : new Date()
    const avgDuration = (parseInt(r.job.averageDuration, 10) / 1000) | 0
    jobAry.push({
      timeRange: [startDt, endDt],
      val: r.status,
      avgDuration,
      linkUrl: r.permalink,
    })
  })

  const converted = []
  for (const [group, labelMap] of groupMap.entries()) {
    const groupData = []
    for (const [label, jobAry] of labelMap.entries()) {
      groupData.push({
        label,
        data: jobAry,
      })
    }
    converted.push({
      group,
      data: groupData,
    })
  }
  return converted
}

export default {
  async fetch() {
    try {
      const { data: projects } = await axios.get('/api/projects')
      this.projects = projects
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load projects: %o`, err)
    }
  },
  data() {
    return {
      selectedProject: 'TrafficAcquisition',
      projects: [],
      endDate: moment().format('YYYY-MM-DD'),
      endDateMenu: false,
      endTime: moment().format('HH:mm'),
      endTimeMenu: false,
      lookback: 12,
      raw: [],
      jobs: {
        groups: [],
        names: [],
        statuses: [],
      },
      filter: {},
    }
  },
  fetchOnServer: false,
  methods: {
    hasData() {
      return this.raw && this.raw.length > 0
    },
    getJobsInGroup() {
      return this.filter.group ? this.jobs.names.get(this.filter.group) : []
    },
    async loadExecutions() {
      this.raw = null
      const endMillis = moment(
        `${this.endDate} ${this.endTime}`,
        'YYYY-MM-DD HH:mm'
      ).valueOf()
      const beginMillis = endMillis - this.lookback * 3600 * 1000
      const { data: raw } = await this.$axios.get(
        `/api/executions?project=${this.selectedProject}&begin=${beginMillis}&end=${endMillis}`
      )
      this.jobs = {
        groups: [],
        names: [],
        statuses: [],
      }

      this.raw = raw
      this.jobs.groups = [
        '',
        ...new Set(this.raw.map((r) => r.job.group)),
      ].sort()
      this.jobs.names = new Map(
        this.jobs.groups.map((g) => {
          return [
            g,
            [
              '',
              ...new Set(
                this.raw.filter((r) => r.job.group === g).map((r) => r.job.name)
              ),
            ].sort(),
          ]
        })
      )
      this.jobs.statuses = [
        '',
        ...new Set(this.raw.map((r) => r.status)),
      ].sort()

      this.showExecutions()
    },
    showExecutions() {
      const executions = this.raw
        .filter((r) => !this.filter.group || this.filter.group === r.job.group)
        .filter((r) => !this.filter.name || this.filter.name === r.job.name)
        .filter((r) => !this.filter.status || this.filter.status === r.status)
      this.$refs.tl.chart(convertNode(executions))
    },
  },
}
</script>

<style>
.timelines-chart .axises .y-axis text,
.timelines-chart .axises .grp-axis text {
  font-size: 1em;
  fill: rgb(236, 220, 220);
}

.chart-tooltip.group-tooltip,
.chart-tooltip.line-tooltip,
.chart-tooltip.segment-tooltip {
  font-weight: normal;
  font-size: 0.75rem;
  background-color: rgb(151, 105, 12);
  color: white;
}
</style>
