/**
 * # Endpoint
 * - {@link OizomDatapoint}
 *
 * @module
 *
 * @example
 * ```ts
 * import { OizomDatapoint } from "@panth977/routes";
 * 
 * const dpGap = input.period === 'raw' ? 60 : input.period === 'hr' ? 3600 : 24 * 3600; // assuming all data is in minutes
 * const datapoints = OizomDatapoint.create(input.device.deviceId, input.device.deviceType, {
 *     gapInMs: dpGap * 1000,
 *     gteInMs: Math.floor(input.gte / dpGap) * dpGap * 1000, // in-case user sends random seconds in gte/lte
 *     lteInMs: Math.ceil(input.lte / dpGap) * dpGap * 1000,
 *     keys: getKeysFrom(partitions).length,
 *     meta: input.keys.filter(Flag.isFlagKey).length,
 * });
 * for (const row of result) {
 *     const rIdx = datapoints.data.getRIdx(row.ts * 1000, true);
 *     if (row.dbl_v != null) {
 *         const cIdx = datapoints.data.getCIdx('data', row.key, true);
 *         datapoints.data.set(rIdx, cIdx, row.dbl_v);
 *     }
 *     if (Flag.isFlagKey(row.key) && row.str_v != null) {
 *         const cIdx = datapoints.data.getCIdx('meta', row.key, true);
 *         datapoints.data.set(rIdx, cIdx, row.str_v);
 *     }
 * }
 * 
 * const dpGap = input.device.deviceType === 'BEANAIR' || input.period === 'realtime' ? 1 : 60; // assuming all data is in minutes
 * const datapoints = OizomDatapoint.create(input.device.deviceId, input.device.deviceType, {
 *     gapInMs: dpGap * 1_000,
 *     gteInMs: Math.floor(input.gte / dpGap) * dpGap * 1000, // in-case user sends random seconds in gte/lte
 *     lteInMs: Math.ceil(input.lte / dpGap) * dpGap * 1000,
 *     keys: input.keys.length,
 *     meta: 0,
 * });
 * for await (const row of res) {
 *     const rIdx = datapoints.data.getRIdx(new Date(row._time).getTime(), true);
 *     const cIdx = datapoints.data.getCIdx('data', row._field, true);
 *     datapoints.data.set(rIdx, cIdx, row._value);
 * }
 * ```
 */

import { D } from "@panth977/data";
export type Legacy = {
  deviceId: string;
  deviceType: string;
  payload: {
    t: number; // epoch in seconds
    d: {
      [parameter: string]: number; // concentration
      t: number; // epoch in seconds
    };
    s: {
      [label: string]: string; // key value pair;
    };
  };
}[];
export type Compact = {
  deviceId: string;
  deviceType: string;
  keys: string[];
  labels: string[];
  data: [
    number, // epoch in milliseconds
    (null | number)[], // concentration in order of [...keys]
    (null | string)[], // values in order of [...labels]
  ][];
};
const parser = D.PredefinedEpochAxis.parser({
  data: D.KeyAxis.parser(D.FloatDataArray.parser()),
  meta: D.KeyAxis.parser(D.StrDataArray.parser()),
});
export class OizomDatapoint {
  constructor(
    readonly deviceId: string,
    readonly deviceType: string,
    readonly data: D.PredefinedEpochAxis<{
      data: D.KeyAxis<D.FloatDataArray>;
      meta: D.KeyAxis<D.StrDataArray>;
    }>,
  ) {
    if (typeof deviceId !== "string") throw new Error("DeviceId not a string");
    if (typeof deviceType !== "string")
      throw new Error("DeviceType not a string");
    if (data instanceof D.PredefinedEpochAxis === false)
      throw new Error("data not a table");
  }
  /**
   * this is used for latest datapoint
   */
  static createOneDatapoint(
    deviceId: string,
    deviceType: string,
    options: { keys: number; meta: number },
  ): OizomDatapoint {
    return new OizomDatapoint(
      deviceId,
      deviceType,
      new D.PredefinedEpochAxis({
        data: options.keys
          ? new D.KeyAxis(new D.FloatDataArray()).expand(options.keys)
          : new D.KeyAxis(new D.FloatDataArray()),
        meta: options.meta
          ? new D.KeyAxis(new D.StrDataArray()).expand(options.meta)
          : new D.KeyAxis(new D.StrDataArray()),
      }).optimize({
        gap: D.PredefinedEpochAxis.msPer.ms,
        gte: Date.now() - D.PredefinedEpochAxis.msPer.ms,
        lte: Date.now(),
      }),
    );
  }
  /**
   * this is used for dataset rang of time data
   */
  static create(
    deviceId: string,
    deviceType: string,
    options: {
      keys: number;
      meta: number;
      gteInMs: number;
      lteInMs: number;
      gapInMs: number;
    },
  ): OizomDatapoint {
    return new OizomDatapoint(
      deviceId,
      deviceType,
      new D.PredefinedEpochAxis({
        data: options.keys
          ? new D.KeyAxis(new D.FloatDataArray()).expand(options.keys)
          : new D.KeyAxis(new D.FloatDataArray()),
        meta: options.meta
          ? new D.KeyAxis(new D.StrDataArray()).expand(options.meta)
          : new D.KeyAxis(new D.StrDataArray()),
      }).optimize({
        gap: options.gapInMs * D.PredefinedEpochAxis.msPer.ms,
        gte: options.gteInMs * D.PredefinedEpochAxis.msPer.ms,
        lte:
          (options.lteInMs + options.gapInMs) * D.PredefinedEpochAxis.msPer.ms,
      }),
    );
  }
  /**
   * this is used for quick exit
   */
  static empty(deviceId: string, deviceType: string): OizomDatapoint {
    return new OizomDatapoint(
      deviceId,
      deviceType,
      new D.PredefinedEpochAxis({
        data: new D.KeyAxis(new D.FloatDataArray()),
        meta: new D.KeyAxis(new D.StrDataArray()),
      }),
    );
  }

  /**
   * this will simply convert to OizomDatapoint => string, for http transmission
   */
  static encoder(val: OizomDatapoint): string {
    return new Base64Parser().to(val);
  }
  /**
   * this will simply convert to string => OizomDatapoint, for http transmission
   */
  static decoder(val: string): OizomDatapoint {
    return new Base64Parser().from(val);
  }
  /**
   * this will simply convert to Legacy => OizomDatapoint
   */
  static fromLegacy(data: Legacy): OizomDatapoint {
    return new LegacyParser().from(data);
  }
  /**
   * this will simply convert to OizomDatapoint => Legacy
   */
  toLegacy(): Legacy {
    return new LegacyParser().to(this);
  }
  /**
   * this will simply convert to Compact => OizomDatapoint
   */
  static fromCompact(payload: Compact): OizomDatapoint {
    return new CompactParser().from(payload);
  }
  /**
   * this will simply convert to OizomDatapoint => Compact
   */
  toCompact(): Compact {
    return new CompactParser().to(this);
  }
  /**
   * this will simply copy
   */
  copy(): OizomDatapoint {
    return new OizomDatapoint(this.deviceId, this.deviceType, this.data.copy());
  }
  /**
   * filter those that are needed, and more new copy
   */
  filter(
    predicate: ((row: number, rIdx: number) => boolean) | [number, number][],
  ): OizomDatapoint {
    return new OizomDatapoint(
      this.deviceId,
      this.deviceType,
      this.data.filter(parser, predicate),
    );
  }
}

abstract class Parser<T> {
  abstract to(dp: OizomDatapoint): T;
  abstract from(data: T): OizomDatapoint;
}
class Base64Parser extends Parser<string> {
  override to(dp: OizomDatapoint): string {
    // obj => buff
    const strBuff = D.Parsers.StringList.encode([dp.deviceId, dp.deviceType]);
    const dataBuff = parser.encode(dp.data);
    const buff = D.Parsers.ArrayBufferList.encode([strBuff, dataBuff]);
    // buff => base64
    const bytes = new Uint8Array(buff);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  override from(str: string): OizomDatapoint {
    // base64 => buff
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const buff = bytes.buffer;
    // buff => obj
    const [strBuff, dataBuff] = D.Parsers.ArrayBufferList.decode(buff);
    const [deviceId, deviceType] = D.Parsers.StringList.decode(strBuff);
    const data = parser.decode(dataBuff);
    return new OizomDatapoint(deviceId, deviceType, data);
  }
}
class LegacyParser extends Parser<Legacy> {
  override to(dp: OizomDatapoint): Legacy {
    const data: Legacy = [];
    const { deviceId, deviceType } = dp;
    const timePer = D.PredefinedEpochAxis.msPer.sec;
    const dCols = [...dp.data.cols("data", "[col,cIdx]")];
    const sCols = [...dp.data.cols("meta", "[col,cIdx]")];
    for (const [t_, rIdx] of dp.data.rows("[row,rIdx]")) {
      const t = t_ / timePer;
      const p: Legacy[number] = {
        deviceId,
        deviceType,
        payload: { t, s: {}, d: { t } },
      };
      data.push(p);
      for (const [k, cIdx] of dCols) {
        const val = dp.data.get(rIdx, cIdx);
        if (val != undefined) p.payload.d[k] = val;
      }
      for (const [k, cIdx] of sCols) {
        const val = dp.data.get(rIdx, cIdx);
        if (val != undefined) p.payload.s[k] = val;
      }
      p.payload.d.t = t;
    }
    // return data.sort((x, y) => y.payload.d.t - x.payload.d.t);
    return data.reverse();
  }
  override from(data: Legacy): OizomDatapoint {
    if (!data.length) throw new Error("Cannot conclude");
    const keys = [...new Set(data.map((x) => Object.keys(x.payload.d)).flat())];
    const meta = [...new Set(data.map((x) => Object.keys(x.payload.s)).flat())];
    let dp: OizomDatapoint;
    if (data.length === 1) {
      dp = OizomDatapoint.createOneDatapoint(
        data[0].deviceId,
        data[0].deviceType,
        {
          keys: keys.length,
          meta: meta.length,
        },
      );
    } else {
      data = [...data].sort((x, y) => y.payload.t - x.payload.t);
      const gaps = [
        ...new Set(
          data.slice(1).map((x, i) => data[i - 1].payload.t - x.payload.t),
        ),
      ];
      dp = OizomDatapoint.create(data[0].deviceId, data[0].deviceType, {
        gapInMs:
          gaps.length > 1
            ? Math.min(...gaps) < 60
              ? 1000
              : 60000
            : gaps[0] * 1000,
        gteInMs: data[data.length - 1].payload.t * 1000,
        lteInMs: data[0].payload.t * 1000,
        keys: keys.length,
        meta: meta.length,
      });
    }
    const keysCIdx = keys.map(
      (x) => [x, dp.data.getCIdx("data", x, true)] as const,
    );
    const metaCIdx = meta.map(
      (x) => [x, dp.data.getCIdx("meta", x, true)] as const,
    );
    for (const point of data) {
      const rIdx = dp.data.getRIdx(point.payload.t * 1000, true);
      for (const [key, cIdx] of keysCIdx) {
        if (key in point.payload.d) {
          dp.data.set(rIdx, cIdx, point.payload.d[key]);
        }
      }
      for (const [key, cIdx] of metaCIdx) {
        if (key in point.payload.s) {
          dp.data.set(rIdx, cIdx, point.payload.s[key]);
        }
      }
    }
    return dp;
  }
}
class CompactParser extends Parser<Compact> {
  override to(dp: OizomDatapoint): Compact {
    const data: Compact["data"] = [];
    const { deviceId, deviceType } = dp;
    const timePer = D.PredefinedEpochAxis.msPer.ms;
    const dCols = [...dp.data.cols("data", "[col,cIdx]")];
    const sCols = [...dp.data.cols("meta", "[col,cIdx]")];
    for (const [t_, rIdx] of dp.data.rows("[row,rIdx]")) {
      const t = t_ / timePer;
      const p: Compact["data"][number] = [t, [], []];
      data.push(p);
      for (const [, cIdx] of dCols) {
        const val = dp.data.get(rIdx, cIdx);
        p[1].push(val ?? null);
      }
      for (const [, cIdx] of sCols) {
        const val = dp.data.get(rIdx, cIdx);
        p[2].push(val ?? null);
      }
    }
    return {
      // data: data.sort((x, y) => y[0] - x[0]),
      data: data.reverse(),
      deviceId,
      deviceType,
      keys: dCols.map((x) => x[0]),
      labels: sCols.map((x) => x[0]),
    };
  }
  override from(data: Compact): OizomDatapoint {
    const keys = [...new Set(data.keys)];
    const meta = [...new Set(data.labels)];
    if (data.data.length === 0) {
      return OizomDatapoint.empty(data.deviceId, data.deviceType);
    }
    let dp: OizomDatapoint;
    if (data.data.length === 1) {
      dp = OizomDatapoint.createOneDatapoint(data.deviceId, data.deviceType, {
        keys: keys.length,
        meta: meta.length,
      });
    } else {
      data.data = [...data.data].sort((x, y) => y[0] - x[0]);
      const gaps = [
        ...new Set(
          data.data.slice(1).map((x, i) => data.data[i - 1][0] - x[0]),
        ),
      ];
      dp = OizomDatapoint.create(data.deviceId, data.deviceType, {
        gapInMs:
          gaps.length > 1
            ? Math.min(...gaps) < 60000
              ? 1000
              : 60000
            : gaps[0],
        gteInMs: data.data[data.data.length - 1][0],
        lteInMs: data.data[0][0],
        keys: keys.length,
        meta: meta.length,
      });
    }
    const keysCIdx = keys.map(
      (x) => [data.keys.indexOf(x), dp.data.getCIdx("data", x, true)] as const,
    );
    const metaCIdx = meta.map(
      (x) =>
        [data.labels.indexOf(x), dp.data.getCIdx("meta", x, true)] as const,
    );
    for (const point of data.data) {
      const rIdx = dp.data.getRIdx(point[0], true);
      for (const [key, cIdx] of keysCIdx) {
        const val = point[1][key];
        if (val != undefined) {
          dp.data.set(rIdx, cIdx, val);
        }
      }
      for (const [key, cIdx] of metaCIdx) {
        const val = point[2][key];
        if (val != undefined) {
          dp.data.set(rIdx, cIdx, val);
        }
      }
    }
    return dp;
  }
}
