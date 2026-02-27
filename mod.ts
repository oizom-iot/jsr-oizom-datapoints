/**
 * # Endpoint
 * - {@link OizomDatapoint}
 *
 * @module
 *
 * @example
 * ```ts
 * import { OizomDatapoint } from "@oizom/oizom-datapoints";
 *
 * const dpGap = input.period === 'raw' ? 60 : input.period === 'hr' ? 3600 : 24 * 3600; // assuming all data is in minutes
 * const datapoints = OizomDatapoint.createPeriodic(input.device.deviceId, input.device.deviceType, {
 *     gapInMs: dpGap * 1000,
 *     gteInMs: Math.floor(input.gte / dpGap) * dpGap * 1000, // in-case user sends random seconds in gte/lte
 *     lteInMs: Math.ceil(input.lte / dpGap) * dpGap * 1000,
 * }, {
 *     keys: getKeysFrom(partitions),
 *     meta: input.keys.filter(Flag.isFlagKey),
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
 * const datapoints = OizomDatapoint.createPeriodic(input.device, {
 *     gapInMs: dpGap * 1_000,
 *     gteInMs: Math.floor(input.gte / dpGap) * dpGap * 1000, // in-case user sends random seconds in gte/lte
 *     lteInMs: Math.ceil(input.lte / dpGap) * dpGap * 1000,
 * }, { keys: input.keys, meta: 0 });
 * for await (const row of res) {
 *     const rIdx = datapoints.data.getRIdx(new Date(row._time).getTime(), true);
 *     const cIdx = datapoints.data.getCIdx('data', row._field, true);
 *     datapoints.data.set(rIdx, cIdx, row._value);
 * }
 * ```
 */

import { OizomDatapoint, type CT } from "./factory.ts";
import { PredefinedOizomDatapoints } from "./predefined.ts";
import { RelativeOizomDatapoints } from "./relative.ts";

export * from "./factory.ts";

OizomDatapoint.createPeriodic = function (device, range, size) {
  const modal = PredefinedOizomDatapoints.parser.create();
  modal.optimize({
    gap: range.gapInMs,
    gte: range.gteInMs,
    lte: range.lteInMs,
  });
  for (const topic in size) {
    const s = size[topic as keyof CT];
    if (typeof s === "number") {
      modal.expandCol(topic as keyof CT, s);
    } else {
      modal.expandCol(topic as keyof CT, s.length);
      for (const c of s) {
        modal.getCIdx(topic as keyof CT, c, true);
      }
    }
  }
  return new PredefinedOizomDatapoints(
    device.deviceId,
    device.deviceType,
    modal,
  );
};

OizomDatapoint.createUnPeriodic = function (device, range, size) {
  const modal = RelativeOizomDatapoints.parser.create();
  modal.optimize({
    gap: Math.ceil((range.lteInMs - range.gteInMs) / range.count),
    gte: range.gteInMs,
    lte: range.lteInMs,
  });
  for (const topic in size) {
    const s = size[topic as keyof CT];
    if (typeof s === "number") {
      modal.expandCol(topic as keyof CT, s);
    } else {
      modal.expandCol(topic as keyof CT, s.length);
      for (const c of s) {
        modal.getCIdx(topic as keyof CT, c, true);
      }
    }
  }
  return new RelativeOizomDatapoints(device.deviceId, device.deviceType, modal);
};

OizomDatapoint.single = function (device, size) {
  const modal = RelativeOizomDatapoints.parser.create();
  for (const topic in size) {
    const s = size[topic as keyof CT];
    if (typeof s === "number") {
      modal.expandCol(topic as keyof CT, s);
    } else {
      modal.expandCol(topic as keyof CT, s.length);
      for (const c of s) {
        modal.getCIdx(topic as keyof CT, c, true);
      }
    }
  }
  return new RelativeOizomDatapoints(device.deviceId, device.deviceType, modal);
};

OizomDatapoint.empty = function (device) {
  return new RelativeOizomDatapoints(
    device.deviceId,
    device.deviceType,
    RelativeOizomDatapoints.parser.create(),
  );
};

