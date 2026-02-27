import { D } from "@panth977/data";
import { OizomDatapoint } from "./base.ts";

type Modal = D.PredefinedEpochAxis<{
  data: D.KeyAxis<D.FloatDataArray>;
  meta: D.KeyAxis<D.StrDataArray>;
}>;
export class PredefinedOizomDatapoints extends OizomDatapoint {
  static parser = D.PredefinedEpochAxis.parser({
    data: D.KeyAxis.parser(D.FloatDataArray.parser()),
    meta: D.KeyAxis.parser(D.StrDataArray.parser()),
  });
  static getModal(dp: PredefinedOizomDatapoints): Modal {
    return dp.modal;
  }

  constructor(
    deviceId: string,
    deviceType: string,
    private modal: Modal,
  ) {
    super(deviceId, deviceType, modal);
  }
  override copy(): PredefinedOizomDatapoints {
    return new PredefinedOizomDatapoints(
      this.deviceId,
      this.deviceType,
      this.modal.copy(),
    );
  }
  override filter(
    predicate: ((row: number, rIdx: number) => boolean) | [number, number][],
  ): PredefinedOizomDatapoints {
    return new PredefinedOizomDatapoints(
      this.deviceId,
      this.deviceType,
      this.modal.filter(PredefinedOizomDatapoints.parser, predicate),
    );
  }
}
