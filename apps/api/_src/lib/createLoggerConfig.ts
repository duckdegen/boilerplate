import strip from "strip-ansi"
import * as winston from "winston"
import { format } from "winston"

const prettyJson = (obj: any): string => {
  return JSON.stringify(obj, undefined, 2)
}

const debugOnlyFormat = format(info => (info.level === "debug" ? info : false))

const stripAnsi = format((info, _opts) => {
  info.message = strip(info.message)

  return info
})

const consoleFormatDev = winston.format.combine(
  debugOnlyFormat(),
  winston.format.colorize(),
  winston.format.simple()
)

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  stripAnsi(),
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  winston.format.printf(i => `${i["timestamp"]} | ${i.message}. ${prettyJson(i)}`)
)

export const reformatMetadataJson = winston.format(info => {
  if (info["metadata"]) {
    info["metadata"] = prettyJson(info["metadata"])
  }
  return info
})

export const createLoggerConfig = (
  c: { devMode: boolean; service: string; baseDir?: string; defaultLevel?: string },
  meta?: Record<string, string>
) => ({
  defaultMeta: c.devMode ? meta : { service: c.service, ...meta },
  transports: c.devMode
    ? [
      new winston.transports.Console({
        level: "debug",
        format: consoleFormatDev
      }),
      new winston.transports.Console({
        level: "error",
        format: consoleFormatDev
      }),
      new winston.transports.File({
        level: "verbose",
        filename: `${c.baseDir ?? ".logs"}/combined.log`,
        format: fileFormat
      }),
      new winston.transports.File({
        filename: `${c.baseDir ?? ".logs"}/errors.log`,
        level: "error",
        format: fileFormat
      })
    ]
    : [
      // for now output just standard console stuff, because Azure Log Analytics is weird.
      new winston.transports.Console({
        // level: c.defaultLevel,
        format: fileFormat
        // winston.format.combine(
        //   winston.format.timestamp(),
        //   winston.format.metadata({
        //     fillExcept: [
        //       "level",
        //       "message",
        //       "timestamp",
        //       "requestId",
        //       "requestName",
        //       "requestLocale",
        //     ],
        //   }),
        //   reformatMetadataJson(),
        //   winston.format.json()
        // ),
      })
    ]
})
