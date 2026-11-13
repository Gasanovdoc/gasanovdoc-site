// Соответствие русских и английских страниц. По этой таблице шапка сайта ставит
// переключатель RU/EN и теги hreflang. Добавляя статью на обоих языках — добавьте строку сюда.
export const hubEn: Record<string, string> = {
  sosudy: 'vascular',
  opuholi: 'tumors',
  pozvonochnik: 'spine',
  nervy: 'nerves',
  'gidrocefaliya-i-cherep': 'hydrocephalus-skull',
};

// [hub, ruSlug, enSlug]
export const articles: [string, string, string][] = [
  ['sosudy', 'anevrizma', 'brain-aneurysm'],
  ['sosudy', 'stenoz-sonnoj-arterii', 'carotid-stenosis'],
  ['sosudy', 'okklyuziya-sonnoj-arterii', 'carotid-occlusion-bypass'],
  ['sosudy', 'moyamoya', 'moyamoya'],
  ['sosudy', 'avm', 'avm'],
  ['sosudy', 'kavernoma', 'cavernoma'],
  ['sosudy', 'nevralgiya-trojnichnogo-nerva', 'trigeminal-neuralgia'],
  ['opuholi', 'opuholi-golovnogo-mozga', 'brain-tumors'],
  ['opuholi', 'meningioma', 'meningioma'],
  ['opuholi', 'glioma', 'glioma'],
  ['opuholi', 'adenoma-gipofiza', 'pituitary-adenoma'],
  ['opuholi', 'metastazy', 'brain-metastases'],
  ['opuholi', 'nevrinoma', 'schwannoma'],
  ['pozvonochnik', 'gryzha-diska', 'disc-herniation'],
  ['pozvonochnik', 'blokady-i-rcha', 'nerve-blocks-rfa'],
  ['nervy', 'tunnelnye-sindromy', 'entrapment-neuropathies'],
  ['nervy', 'sindrom-zapyastnogo-kanala', 'carpal-tunnel-syndrome'],
  ['nervy', 'kubitalnyj-sindrom', 'cubital-tunnel-syndrome'],
  ['nervy', 'sindrom-kanala-giona', 'guyon-canal-syndrome'],
  ['nervy', 'sindrom-fibulyarnogo-kanala', 'peroneal-nerve-entrapment'],
  ['nervy', 'sindrom-tarzalnogo-kanala', 'tarsal-tunnel-syndrome'],
  ['nervy', 'meralgiya', 'meralgia-paresthetica'],
  ['nervy', 'povrezhdeniya-nervov', 'nerve-injuries'],
  ['gidrocefaliya-i-cherep', 'gidrocefaliya', 'hydrocephalus'],
  ['gidrocefaliya-i-cherep', 'kranioplastika', 'cranioplasty'],
];

export const enPathOf = (hub: string, ruSlug?: string) => {
  if (!ruSlug) return `/en/treatment/${hubEn[hub]}/`;
  const a = articles.find(([h, r]) => h === hub && r === ruSlug);
  return a ? `/en/treatment/${hubEn[hub]}/${a[2]}/` : undefined;
};

const pairs: [string, string][] = [
  ['/lechenie/', '/en/treatment/'],
  ...Object.entries(hubEn).map(([r, e]) => [`/lechenie/${r}/`, `/en/treatment/${e}/`] as [string, string]),
  ...articles.map(([h, r, e]) => [`/lechenie/${h}/${r}/`, `/en/treatment/${hubEn[h]}/${e}/`] as [string, string]),
];
export function pairFor(path: string): { ru: string; en: string } | undefined {
  const p = pairs.find(([r, e]) => r === path || e === path);
  return p ? { ru: p[0], en: p[1] } : undefined;
}
