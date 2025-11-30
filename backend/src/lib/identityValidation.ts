import { HttpError } from './httpError';

const verhoeffMultiplicationTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const verhoeffPermutationTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const verhoeffInverseTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

const calculateVerhoeff = (value: string): number => {
  let checksum = 0;
  const digits = value.split('').reverse();
  for (let i = 0; i < digits.length; i++) {
    const digit = Number(digits[i]);
    if (Number.isNaN(digit)) {
      throw new HttpError(422, 'Aadhaar number must be numeric');
    }
    checksum = verhoeffMultiplicationTable[checksum][verhoeffPermutationTable[(i + 1) % 8][digit]];
  }
  return verhoeffInverseTable[checksum];
};

export const assertValidAadhaar = (aadhaar: string): void => {
  const sanitized = aadhaar.replace(/\s+/g, '');
  if (!/^\d{12}$/.test(sanitized)) {
    throw new HttpError(422, 'Aadhaar number must be 12 digits');
  }
  const checksum = calculateVerhoeff(sanitized.slice(0, -1));
  if (checksum !== Number(sanitized.slice(-1))) {
    throw new HttpError(422, 'Aadhaar number failed checksum validation');
  }
};

const luhnForAlphaNumeric = (input: string): boolean => {
  const normalized = input.toUpperCase();
  const digits: number[] = [];
  for (const char of normalized) {
    if (/\d/.test(char)) {
      digits.push(Number(char));
    } else if (/[A-Z]/.test(char)) {
      digits.push(char.charCodeAt(0) - 55); // A=10
    } else {
      return false;
    }
  }
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits[i];
    if (shouldDouble) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;

export const assertValidPan = (pan: string): void => {
  const normalized = pan.toUpperCase();
  if (!PAN_PATTERN.test(normalized)) {
    throw new HttpError(
      422,
      'PAN must follow the pattern AAAAA9999A (alphanumeric 10 characters)'
    );
  }
  if (!luhnForAlphaNumeric(normalized)) {
    throw new HttpError(422, 'PAN failed checksum validation');
  }
};
