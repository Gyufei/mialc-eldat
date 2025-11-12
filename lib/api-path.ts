export const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === '1';
export const isProduction = process.env.NODE_ENV === 'production' && !isPreview;

const ProdHost = '';
const DevHost = '';
const Host = isProduction ? ProdHost : DevHost;
const isMock = true;

export const ApiPath = {
  airdrop: !isMock
    ? `${Host}/airdrop`
    : 'https://mock.apipost.net/mock/551dea3698ca000/?apipost_id=11deab20b1b003',
  claim: !isMock
    ? `${Host}/claim`
    : 'https://mock.apipost.net/mock/551dea3698ca000/?apipost_id=1200ad1831b02f',
};
