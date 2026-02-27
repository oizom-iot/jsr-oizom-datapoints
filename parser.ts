import { OizomDatapoint, type Compact, type Legacy } from "./factory.ts";
import { D } from "@panth977/data";
import { PredefinedOizomDatapoints } from "./predefined.ts";
import { RelativeOizomDatapoints } from "./relative.ts";

abstract class Parser<T> {
  abstract to(dp: OizomDatapoint): T;
  abstract from(data: T): OizomDatapoint;
}
export class Base64Parser extends Parser<string> {
  override to(dp: OizomDatapoint): string {
    // obj => buff
    let strBuff;
    let dataBuff;
    if (dp instanceof PredefinedOizomDatapoints) {
      strBuff = D.Parsers.StringList.encode([
        dp.deviceId,
        dp.deviceType,
        "predefined",
      ]);
      dataBuff = PredefinedOizomDatapoints.parser.encode(
        PredefinedOizomDatapoints.getModal(dp),
      );
    } else if (dp instanceof RelativeOizomDatapoints) {
      strBuff = D.Parsers.StringList.encode([
        dp.deviceId,
        dp.deviceType,
        "relative",
      ]);
      dataBuff = RelativeOizomDatapoints.parser.encode(
        RelativeOizomDatapoints.getModal(dp),
      );
    } else {
      throw new Error("Unknown type found");
    }
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
    const [deviceId, deviceType, type] = D.Parsers.StringList.decode(strBuff);
    if (type === "predefined") {
      const data = PredefinedOizomDatapoints.parser.decode(dataBuff);
      return new PredefinedOizomDatapoints(deviceId, deviceType, data);
    } else if (type === "relative") {
      const data = RelativeOizomDatapoints.parser.decode(dataBuff);
      return new RelativeOizomDatapoints(deviceId, deviceType, data);
    } else {
      throw new Error("Unknown type found");
    }
  }
}
export class LegacyParser extends Parser<Legacy> {
  override to(dp: OizomDatapoint): Legacy {
    const data: Legacy = [];
    const { deviceId, deviceType } = dp;
    const dCols = [...dp.cols("data", "[col,cIdx]")];
    const sCols = [...dp.cols("meta", "[col,cIdx]")];
    for (const [t_, rIdx] of dp.rows("[row,rIdx]")) {
      const t = t_ / 1000;
      const p: Legacy[number] = {
        deviceId,
        deviceType,
        payload: { t, s: {}, d: { t } },
      };
      data.push(p);
      for (const [k, cIdx] of dCols) {
        const val = dp.get(rIdx, cIdx);
        if (val != undefined) p.payload.d[k] = val;
      }
      for (const [k, cIdx] of sCols) {
        const val = dp.get(rIdx, cIdx);
        if (val != undefined) p.payload.s[k] = val;
      }
      p.payload.d.t = t;
    }
    if (dp instanceof PredefinedOizomDatapoints) {
      return data.reverse();
    } else if (dp instanceof RelativeOizomDatapoints) {
      return data.sort((x, y) => y.payload.d.t - x.payload.d.t);
    } else {
      throw new Error("Unknown type found");
    }
  }
  override from(data: Legacy): OizomDatapoint {
    if (!data.length) throw new Error("Cannot conclude");
    const keys = [...new Set(data.map((x) => Object.keys(x.payload.d)).flat())];
    const meta = [...new Set(data.map((x) => Object.keys(x.payload.s)).flat())];
    let dp: OizomDatapoint;
    if (data.length === 1) {
      dp = OizomDatapoint.single(data[0], {
        data: keys.length,
        meta: meta.length,
      });
    } else {
      // data = [...data].sort((x, y) => y.payload.t - x.payload.t);
      const gaps = new Set<number>();
      for (let i = 1; i < data.length; i++) {
        gaps.add(data[i - 1].payload.t - data[i].payload.t);
      }
      const gapInSec = OizomDatapoint.HCF(...gaps);
      if (
        // packing efficiency
        (data.length * gapInSec) /
          (data[0].payload.t - data[data.length - 1].payload.t) <
        0.7
      ) {
        dp = OizomDatapoint.createUnPeriodic(
          data[0],
          {
            count: data.length,
            gteInMs: data[data.length - 1].payload.t * 1000,
            lteInMs: data[0].payload.t * 1000,
          },
          { data: keys, meta: meta },
        );
      } else {
        dp = OizomDatapoint.createPeriodic(
          data[0],
          {
            gapInMs: gapInSec * 1000,
            gteInMs: data[data.length - 1].payload.t * 1000,
            lteInMs: data[0].payload.t * 1000,
          },
          { data: keys, meta: meta },
        );
      }
    }
    const keysCIdx = keys.map((x) => [x, dp.getCIdx("data", x)!] as const);
    const metaCIdx = meta.map((x) => [x, dp.getCIdx("meta", x)!] as const);
    for (const point of data) {
      const rIdx = dp.getRIdx(point.payload.t * 1000, true);
      for (const [key, cIdx] of keysCIdx) {
        if (key in point.payload.d) {
          dp.set(rIdx, cIdx, point.payload.d[key]);
        }
      }
      for (const [key, cIdx] of metaCIdx) {
        if (key in point.payload.s) {
          dp.set(rIdx, cIdx, point.payload.s[key]);
        }
      }
    }
    return dp;
  }
}
export class CompactParser extends Parser<Compact> {
  override to(dp: OizomDatapoint): Compact {
    const data: Compact["data"] = [];
    const { deviceId, deviceType } = dp;
    const dCols = [...dp.cols("data", "[col,cIdx]")];
    const sCols = [...dp.cols("meta", "[col,cIdx]")];
    for (const [t, rIdx] of dp.rows("[row,rIdx]")) {
      const p: Compact["data"][number] = [t, [], []];
      data.push(p);
      for (const [, cIdx] of dCols) {
        const val = dp.get(rIdx, cIdx);
        p[1].push(val ?? null);
      }
      for (const [, cIdx] of sCols) {
        const val = dp.get(rIdx, cIdx);
        p[2].push(val ?? null);
      }
    }
    if (dp instanceof PredefinedOizomDatapoints) {
      return {
        data: data.reverse(),
        deviceId,
        deviceType,
        keys: dCols.map((x) => x[0]),
        labels: sCols.map((x) => x[0]),
      };
    } else if (dp instanceof RelativeOizomDatapoints) {
      return {
        data: data.sort((x, y) => y[0] - x[0]),
        deviceId,
        deviceType,
        keys: dCols.map((x) => x[0]),
        labels: sCols.map((x) => x[0]),
      };
    } else {
      throw new Error("Unknown type found");
    }
  }
  override from(data: Compact): OizomDatapoint {
    const keys = [...new Set(data.keys)];
    const meta = [...new Set(data.labels)];
    if (data.data.length === 0) {
      return OizomDatapoint.empty(data);
    }
    let dp: OizomDatapoint;
    if (data.data.length === 1) {
      dp = OizomDatapoint.single(data, {
        data: keys.length,
        meta: meta.length,
      });
    } else {
      // data.data = [...data.data].sort((x, y) => y[0] - x[0]);
      const gaps = new Set<number>();
      for (let i = 1; i < data.data.length; i++) {
        gaps.add(data.data[i - 1][0] - data.data[i][0]);
      }
      const gapInSec = OizomDatapoint.HCF(...gaps);
      const expected =
        (data.data[0][0] - data.data[data.data.length - 1][0]) / gapInSec;
      if (data.data.length / expected < 0.7) {
        dp = OizomDatapoint.createUnPeriodic(
          data,
          {
            count: data.data.length,
            gteInMs: data.data[data.data.length - 1][0] * 1000,
            lteInMs: data.data[0][0] * 1000,
          },
          { data: keys, meta: meta },
        );
      } else {
        dp = OizomDatapoint.createPeriodic(
          data,
          {
            gapInMs: gapInSec * 1000,
            gteInMs: data.data[data.data.length - 1][0] * 1000,
            lteInMs: data.data[0][0] * 1000,
          },
          { data: keys, meta: meta },
        );
      }
    }
    const keysCIdx = keys.map(
      (x) => [data.keys.indexOf(x), dp.getCIdx("data", x)!] as const,
    );
    const metaCIdx = meta.map(
      (x) => [data.labels.indexOf(x), dp.getCIdx("meta", x)!] as const,
    );
    for (const point of data.data) {
      const rIdx = dp.getRIdx(point[0], true);
      for (const [key, cIdx] of keysCIdx) {
        const val = point[1][key];
        if (val != undefined) {
          dp.set(rIdx, cIdx, val);
        }
      }
      for (const [key, cIdx] of metaCIdx) {
        const val = point[2][key];
        if (val != undefined) {
          dp.set(rIdx, cIdx, val);
        }
      }
    }
    return dp;
  }
}
