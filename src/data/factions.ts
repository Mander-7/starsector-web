export interface FactionDef {
  id: string
  name: string
  color: string
  description: string
}

export const factions: FactionDef[] = [
  { id: 'hegemony', name: '霸主', color: '#ff8844', description: '军事强权，重视实弹武器和厚重装甲' },
  { id: 'tritachyon', name: '速子科技', color: '#44ddff', description: '高科技企业，偏好能量武器和先进护盾' },
  { id: 'pirates', name: '海盗', color: '#ff4444', description: '法外之徒，装备混乱但数量众多' },
  { id: 'independent', name: '自由联盟', color: '#44cc66', description: '中立势力，装备多样化' },
]
