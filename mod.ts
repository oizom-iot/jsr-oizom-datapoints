/**
 * # Endpoint
 * - {@link OizomDatapoint}
 *
 * @module
 *
 * @example
 * ```ts
 * import { OizomDatapointFactoryBuilder } from "@oizom/oizom-datapoints";
 *
 * const dpGap = input.period === 'raw' ? 60 : input.period === 'hr' ? 3600 : 24 * 3600; // assuming all data is in minutes
 * const datapoints = OizomDatapointFactoryBuilder.createPeriodic(input.device.deviceId, input.device.deviceType, {
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
 * const datapoints = OizomDatapointFactoryBuilder.createPeriodic(input.device, {
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

export * from "./factory.ts";
export * from "./base.ts";
