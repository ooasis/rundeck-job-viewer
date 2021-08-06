/* eslint-disable node/no-deprecated-api */
import url from 'url'
import axios from 'axios'

const instance = axios.create({
  baseURL: process.env.RUNDECK_URL,
})

instance.defaults.headers.common['X-Rundeck-Auth-Token'] =
  process.env.RUNDECK_ACCESS_TOKEN
// eslint-disable-next-line dot-notation
instance.defaults.headers.common['Accept'] = 'application/json'

const maxRows = 1000

export default async function (req, res, next) {
  let result = 'no match router'
  const urlParsed = url.parse(req.url, true)
  if (urlParsed.pathname === '/projects') {
    result = await getProjects()
  } else if (urlParsed.pathname === '/executions') {
    const { project, begin: beginMillis, end: endMillis } = urlParsed.query
    result = await getExecutions(project, beginMillis, endMillis, maxRows)
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(result))
}

const getExecutions = async (project, beginMillis, endMillis, maxRows) => {
  let url = `/project/${project}/executions?begin=${beginMillis}&end=${endMillis}&max=${maxRows}`
  const {
    data: { executions: completedExecutions },
  } = await instance.get(url)

  url = `/project/${project}/executions/running?max=${maxRows}`
  const {
    data: { executions: runningExecutions },
  } = await instance.get(url)

  return [...completedExecutions, ...runningExecutions]
}

const getProjects = async () => {
  const url = `/projects`
  const { data: projects } = await instance.get(url)
  return projects.map((p) => p.name)
}
