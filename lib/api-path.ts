export const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === '1';
export const isProduction = process.env.NODE_ENV === 'production' && !isPreview;

const ProdHost = 'https://sb-api.tadle.com ';
const DevHost = 'https://preview-sandbox-api.tadle.com';
const Host = isProduction ? ProdHost : DevHost;

export const ApiPath = {
  airdrop: `${Host}/tle/airdrop`,
  claim: `${Host}/tle/claim`,
};
