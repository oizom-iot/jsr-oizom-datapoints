import type { Compact } from "./base.ts";
import type { Legacy } from "./base.ts";
import type { CT, Device, OizomDatapoint } from "./base.ts";
import { Base64Parser, CompactParser, LegacyParser } from "./parser.ts";
import { PredefinedOizomDatapoints } from "./predefined.ts";
import { RelativeOizomDatapoints } from "./relative.ts";

export class OizomDatapointFactoryBuilder {
  /**
   * Creates a datapoint instance optimized for periodic data (fixed intervals).
   * @param device - Device metadata.
   * @param range - Time range and gap between points.
   * @param size - Number of columns or specific column keys for data/meta.
   */
  static createPeriodic(
    device: Device,
    range: { gteInMs: number; lteInMs: number; gapInMs: number },
    size: { [K in keyof CT]: number | string[] },
  ): OizomDatapoint {
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
  }

  /**
   * Creates a datapoint instance for irregular data over a specific range.
   * @param device - Device metadata.
   * @param range - Time range and expected count of points.
   * @param size - Number of columns or specific column keys.
   */
  static createUnPeriodic(
    device: Device,
    range: { gteInMs: number; lteInMs: number; count: number },
    size: { [K in keyof CT]: number | string[] },
  ): OizomDatapoint {
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
    return new RelativeOizomDatapoints(
      device.deviceId,
      device.deviceType,
      modal,
    );
  }

  /**
   * Creates a datapoint instance containing a single measurement point.
   */
  static single(
    device: Device,
    size: { [K in keyof CT]: number | string[] },
  ): OizomDatapoint {
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
    return new RelativeOizomDatapoints(
      device.deviceId,
      device.deviceType,
      modal,
    );
  }

  /**
   * Creates an empty OizomDatapoint instance.
   */
  static empty(device: Device): OizomDatapoint {
    return new RelativeOizomDatapoints(
      device.deviceId,
      device.deviceType,
      RelativeOizomDatapoints.parser.create(),
    );
  }

  /**
   * Serializes the current object to a Base64 string.
   */
  static toBase64(dp: OizomDatapoint): string {
    return new Base64Parser().to(dp);
  }

  /**
   * Converts the current object to the Legacy data format.
   */
  static toLegacy(dp: OizomDatapoint): Legacy {
    return new LegacyParser().to(dp);
  }

  /**
   * Converts the current object to the Compact array format.
   */
  static toCompact(dp: OizomDatapoint): Compact {
    return new CompactParser().to(dp);
  }

  /**
   * Deserializes a Base64 string into an OizomDatapoint.
   */
  static fromBase64(val: string): OizomDatapoint {
    return new Base64Parser().from(val);
  }

  /**
   * Deserializes Legacy format data into an OizomDatapoint.
   */
  static fromLegacy(data: Legacy): OizomDatapoint {
    return new LegacyParser().from(data);
  }

  /**
   * Deserializes Compact format data into an OizomDatapoint.
   */
  static fromCompact(payload: Compact): OizomDatapoint {
    return new CompactParser().from(payload);
  }

  /**
   * Calculates the Highest Common Factor (Greatest Common Divisor) for a set of numbers.
   */
  static HCF(...numbers: number[]): number {
    if (!numbers.length) return 0;
    let a = numbers[0];
    let i = 1;
    while (i < numbers.length) {
      let b = numbers[i];
      while (b) {
        [a, b] = [b, a % b];
      }
      i++;
    }
    return a;
  }
}
