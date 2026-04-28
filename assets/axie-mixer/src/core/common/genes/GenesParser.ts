import {
  AxieBodyStructure,
  AxiePartStructure,
  axiePartTypes,
  getCharacterClassFromValue,
} from "./BodyStructure";

interface BitsFromLeft {
  (bits: number): bigint;
  peek: (bits: number) => bigint;
  bitsLeft: number;
}

const bitsFromLeft = (value: bigint, totalBits: number): BitsFromLeft => {
  const extractor = ((bits: number) => {
    const extracted = extractor.peek(bits);
    extractor.bitsLeft -= bits;
    return extracted;
  }) as BitsFromLeft;

  extractor.peek = (bits) =>
    extractor.bitsLeft > bits
      ? (value >> BigInt(extractor.bitsLeft - bits)) &
        ((BigInt(1) << BigInt(bits)) - BigInt(1))
      : value & ((BigInt(1) << BigInt(bits)) - BigInt(1));

  extractor.bitsLeft = totalBits;

  return extractor;
};

export const getAxieBodyStructure512 = (
  geneString: string,
): AxieBodyStructure => {
  const genes = BigInt("0x" + geneString.replace("0x", ""));
  const bits = bitsFromLeft(genes, 512);

  const mainClass = Number(bits(5));
  const reservation = Number(bits(45));
  const contribution = Number(bits(5));

  const bodySkinInheritability = Number(bits(1));
  const bodySkin = Number(bits(9));
  const bodyDetail0 = Number(bits(9));
  const bodyDetail1 = Number(bits(9));
  const bodyDetail2 = Number(bits(9));

  const primaryColor0 = Number(bits(6));
  const primaryColor1 = Number(bits(6));
  const primaryColor2 = Number(bits(6));

  const secondaryColor0 = Number(bits(6));
  const secondaryColor1 = Number(bits(6));
  const secondaryColor2 = Number(bits(6));

  const bodyStructure: AxieBodyStructure = {
    class: getCharacterClassFromValue(mainClass),
    body: [bodyDetail0, bodyDetail1, bodyDetail2],
    bodySkin: bodySkin,
    primaryColors: [primaryColor0, primaryColor1, primaryColor2],
    secondaryColors: [secondaryColor0, secondaryColor1, secondaryColor2],
    parts: {} as any,
  };

  for (let partIndex = 0; partIndex < 6; partIndex++) {
    const partStage = Number(bits(2));
    const partReservation = Number(bits(13));
    const partSkinInheritability = Number(bits(1));
    const partSkin = Number(bits(9));

    const partClass0 = Number(bits(5));
    const partValue0 = Number(bits(8));

    const partClass1 = Number(bits(5));
    const partValue1 = Number(bits(8));

    const partClass2 = Number(bits(5));
    const partValue2 = Number(bits(8));
    const partType = axiePartTypes[partIndex];

    const part: AxiePartStructure = {
      stageCap: 2,
      stage: partStage,
      reservation: partReservation,
      skinInheritability: partSkinInheritability === 0 ? false : true,
      skin: partSkin,
      groups: [],
    };

    part.groups.push({
      class: getCharacterClassFromValue(partClass0),
      value: partValue0,
    });
    part.groups.push({
      class: getCharacterClassFromValue(partClass1),
      value: partValue1,
    });
    part.groups.push({
      class: getCharacterClassFromValue(partClass2),
      value: partValue2,
    });

    bodyStructure.parts[partType] = part;
  }

  return bodyStructure;
};
