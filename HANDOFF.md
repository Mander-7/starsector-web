# Starsector Web — 开发者交接文档

## 项目概述

基于 React + TypeScript + Three.js 的远行星号风格网页游戏。包含星图探索、回合制战斗（自动回放）、舰船装配、存档系统。

**在线部署**: Cloudflare Pages（通过 `npm run build` → `dist/` 部署）

---

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 框架 | React 19 + TypeScript 6.0 | `react@^19.2` `typescript@~6.0` |
| 构建 | Vite 8 + Rolldown | `vite@^8.0` |
| 3D渲染 | react-three-fiber + @react-three/drei | `@react-three/fiber@^9.6` |
| UI样式 | Tailwind CSS 4 | `tailwindcss@^4.3` |
| 路由 | react-router-dom v7 | `react-router-dom@^7.15` |
| 状态管理 | Zustand 5 | `zustand@^5.0` |
| 数据库 | Dexie.js (IndexedDB) | `dexie@^4.4` |
| 3D数学 | Three.js 184 | `three@^0.184` |

### TypeScript 严格配置（tsconfig.app.json）
```json
"noUnusedLocals": true,      // 未用局部变量报错
"noUnusedParameters": true,   // 未用参数报错（_ 前缀可豁免）
"verbatimModuleSyntax": true, // import type 必须显式标记
"erasableSyntaxOnly": true    // 禁止 enum/namespace，仅允许可擦除语法
```

---

## 项目结构

```
src/
├── main.tsx              # 入口，挂载 <App/>
├── App.tsx               # 路由: / → MainMenu, /starmap, /battle, /station
├── index.css             # Tailwind + CSS 变量主题
│
├── types/index.ts        # 所有 TypeScript 类型定义（核心！）
│
├── store/
│   ├── playerStore.ts    # 玩家状态（舰队/仓库/信用点/燃料/星图种子）
│   └── uiStore.ts        # UI状态（游戏阶段/战斗速度/暂停）
│
├── db/index.ts           # Dexie IndexedDB 封装（存档/装配/设置表）
│
├── engine/               # 纯逻辑，不依赖 React
│   ├── battleSimulator.ts  # 核心战斗模拟（600 tick，自动回放）
│   ├── shipShapeGenerator.ts # 程序化舰船形状生成（8模板 + 种子PRNG）
│   ├── starMapGen.ts       # 星图生成（LCG 确定性随机，MST图）
│   └── shipAI.ts           # 舰船AI（寻的/战斗距离/撤退逻辑）
│
├── data/                 # 静态游戏数据
│   ├── ships.ts            # 5艘舰船定义（数据+武器槽+3D形状参数）
│   ├── weapons.ts          # 11种武器（实弹/能量/导弹）
│   ├── hullmods.ts         # 5种舰船插件
│   ├── lootTables.ts       # 2张掉落表（海盗/赏金）
│   └── factions.ts         # 4势力定义
│
├── hooks/                # React Hooks
│   ├── useBattleSim.ts     # useMemo 包装战斗模拟
│   └── useAutoSave.ts      # 每30秒自动存档 + 挂载时立即存
│
├── components/
│   ├── battle/
│   │   ├── BattleCanvas.tsx # R3F Canvas：渲染舰船+弹丸+VFX
│   │   ├── ShipModel.tsx    # 单艘3D舰船（挤出几何体+护盾+引擎）
│   │   ├── VFX.tsx          # 弹丸VFX + 爆炸/命中/护盾特效
│   │   └── BattleHUD.tsx    # 战斗UI覆盖层
│   ├── starmap/
│   │   ├── StarMap2D.tsx    # 2D SVG星图（拖拽/缩放/跃迁动画）
│   │   └── StarMap3D.tsx    # 3D星图（备用，当前未使用）
│   ├── station/
│   │   ├── MountGrid.tsx, RefitPanel.tsx, StatsPanel.tsx  # 舰船装配界面
│   │   ├── WarehousePanel.tsx, RepairPanel.tsx, HullModList.tsx
│   │   └── ShipViewer3D.tsx  # 3D舰船查看器
│   └── ui/
│       ├── MenuFlyby.tsx     # 主菜单3D飞船飞越背景
│       ├── ShipSelect.tsx    # 初始舰船选择（6个选项）
│       └── ... (通用UI组件)
│
└── routes/               # 页面级路由组件
    ├── MainMenu.tsx        # 主菜单（新游戏/继续/读档）
    ├── StarMapScreen.tsx   # 星图页面（节点点击/跃迁/存档）
    ├── BattleScreen.tsx    # 战斗页面（回放/速度控制/战利品）
    └── StationScreen.tsx   # 空间站页面（装配/仓库/维修）
```

---

## 核心数据流

### 玩家状态 (Zustand playerStore)
```
playerStore: {
  credits, fleet[], warehouse[], fuel,
  currentSystemId, currentStationId,
  starMapSeed
}
```
- **持久化**: `useAutoSave` 每30秒 + 挂载时写入 IndexedDB (`autosave` 键)
- **手动存档**: StarMapScreen 中创建 `save_${timestamp}` 记录
- **加载**: `loadState()` 直接 set Zustand store

### 战斗模拟流程
```
BattleScreen → useBattleSim(fleet, enemyHullIds)
  → simulateBattle() 引擎层纯函数
    → 初始化 snapshots (舰船+弹药+护盾)
    → 600 tick 主循环:
        Phase A: 武器射击 (冷却检查→弹药检查→弹丸生成)
        Phase B: 弹丸移动 (导弹制导→位置更新)
        Phase C: 碰撞检测:
          Phase C1: 护盾拦截 (半径2.2护盾气泡, 角度判断)
          Phase C2: 船体命中 (半径1.2, 装甲减伤)
    → 每5 tick 或事件发生时记录 snapshot
  → BattleScreen 插值回放 snapshots
  → BattleCanvas R3F 渲染
```

### 存档/读档
```
saveGame(id, name, state) → IndexedDB.saves.put()
loadGame(id) → IndexedDB.saves.get() → PlayerState | null
listSaves() → 按时间倒序
```

### 星图生成
```
starMapSeed (number) → generateStarMap(seed)
  → LCG PRNG 确定性随机
  → 6-9 节点 (最小距离3.5)
  → Prim MST 保证连通
  → +30% 额外边提供备用路径
```

---

## 代码规范

### 通用规则
- 不使用 emoji（功能代码中）
- 不写注释，除非 WHY 非显而易见
- 不写 JSDoc / 多行注释 / 文档注释
- 不创建 README/md 文件（除非 explicitly requested）
- 编辑已有文件优先于创建新文件
- 3 行相似代码 > 过早抽象
- 单行修复不需要 helper 函数
- 不添加不必要的 error handling（信任内部代码和框架保证）

### React/TS
- `import type { ... }` 用于仅类型导入
- Zustand selector 精确到字段（避免不必要重渲染）
- R3F 动画：位置更新用 `useFrame` 直接操作 Three.js 对象（避免 React 重渲染），增删对象才用 `setState`
- CSS 变量 `var(--color-xxx)` 统一主题色，不硬编码

### 3D 坐标约定
- **战斗场景**: XY 平面，Z=0 为基准面，摄像机在 +Z
- **舰船朝向**: rotation 绕 Z 轴，0=右(+X)，π/2=上(+Y)，π=左，-π/2=下
- **舰船局部空间**: 鼻尖=+X，尾尖=-X，护盾弧在 XY 平面

---

## 舰船形状生成器 (shipShapeGenerator.ts)

最复杂的子系统。关键理解：

### 架构
```
HullTemplate (8种) → TemplateDef (控制点+曲线段+鼻型+引擎数+舰桥风)
  → mulberry32(seed) PRNG 随机偏移
  → 生成上半控制点 → 镜像生成下半 → THREE.Shape 路径
  → quadraticCurveTo (curveSegments) + lineTo
  → ExtrudeGeometry (bevel enabled)
```

### 8 种模板
| 模板 | 特征 | 鼻型 | 引擎 | 舰桥 |
|------|------|------|------|------|
| arrow | 均衡箭头 | sharp | 2 | box |
| wedge | 钝头楔形 | blunt | 1 | flat |
| brick | 厚重重型 | blunt | 3 | tower |
| needle | 细长尖锐 | sharp | 1 | sleek |
| crescent | 新月弯刀 | forked | 2 | split |
| hammerhead | 宽头窄尾 | blunt | 3 | flat |
| split | 分叉鼻 | forked | 2 | split |
| lance | 长矛球根 | sharp | 1 | sleek |

### 关键实现细节
- **对称性**: 上半点 → 逆序镜像(negate y) → `[...topPts, ...bottomPts]` → 统一曲线公式
- **种子PRNG**: mulberry32 — 相同种子产生完全相同的形状，用于持久化/回放
- **3D深度**: `depthCurve: [nose, mid, engine]` 乘数，`maxDepthPos/maxDepthVal` 用于装甲顶板定位
- **桥梁几何**: 9种风格 (BoxGeometry/SphereGeometry/CylinderGeometry)
- **引擎几何**: 5种风格 (cylinder/vectored/ion/triple/ring) + 发光环

---

## 战斗系统

### 碰撞检测（两阶段，关键！）
```
Phase 1: 护盾拦截
  - 条件: ship.shieldActive === true
  - 半径: 2.2 (护盾气泡)
  - 角度: |angleToProjectile - shieldFacing| < shieldArc/2
  - 效果: 弹丸销毁, +flux, shieldHit VFX(蓝色双环)

Phase 2: 船体命中
  - 条件: 总是检查（Phase 1 未拦截）
  - 半径: 1.2
  - 效果: 装甲减伤公式 armor/(armor+damage), hull VFX(橙色)
```

### 导弹系统
- **弹药**: `BattleShipSnapshot.missileAmmo: Record<weaponId, count>`，初始化时从武器数据计算
- **侧面发射**: `position + facingDir*0.6 ± perpendicular*(1.0-1.8)`
- **制导**: 每 tick 速度向量转向目标(0.07强度) + 加速(0.003/tick, 最大0.55)
- **冷却**: `200/fireRate`（常规武器 `600/fireRate`）
- **VFX**: 绿色球体(0.4), 外晕(0.65), 尾迹(1.2长度)

### 护盾系统
- **朝向**: `shieldFacing` (弧度) — 舰船面对方向
- **弧宽**: `shieldArc` (度) — 来自 hull.baseStats.shieldArc
- **激活**: 辐能 > 80% 时自动关闭
- **ShipModel 渲染**: RingGeometry 弧段，`rotation = shieldFacing - shipRotation`

---

## 已知问题 / Gotchas

### shipAI.ts 未集成
`src/engine/shipAI.ts` 有完整的舰船移动/转向/战术AI，但 `battleSimulator.ts` 当前使用**静态站位**（player y=-4, enemy y=4），未调用 `runShipAI`。若要启用移动战斗，需要在模拟循环中集成。

### useAutoSave 闭包陷阱
`useAutoSave` 的 effect 依赖数组包含 `fleet` 引用。Zustand selector 用 `Object.is` 比较，若 fleet 被 mutate 而非替换，effect 不会重跑，存档会使用旧状态。当前代码中 `setFleet` 总是创建新数组，但未来修改需注意。

### StarMap2D 动画时机
舰队标记的 CSS `transition` 只在 `travelAnim === true` 时启用（0.7s 后自动关闭），避免平移/缩放时误触发动画。新增跃迁相关功能时注意此机制。

### TypeScript verbatimModuleSyntax
所有 `import type` 必须显式标记。写成 `import { TypeA, TypeB } from './types'` 会报错，必须 `import type { TypeA, TypeB }`。

### R3F useFrame 与 React 状态
`useFrame` 回调捕获渲染时的闭包变量。在 `MenuFlyby` 中，`ships` 状态通过 `setShips` updater 形式更新（`prev => ...`）保证正确性，但直接读取 `ships` 可能拿到旧值。

---

## 开发命令

```bash
npm run dev          # 开发服务器 (localhost:5173)
npm run build        # tsc --noEmit + vite build → dist/
npm run preview      # 本地预览构建产物
```

构建输出: `dist/` → 直接部署到 Cloudflare Pages 或其他静态托管。

---

## 未来扩展方向

1. **舰船移动战斗**: 集成 `shipAI.ts` 到 `battleSimulator.ts`，替换静态站位
2. **更多舰船/武器数据**: 在 `data/ships.ts` 和 `data/weapons.ts` 扩充
3. **舰队多舰**: 当前玩家只有 1 艘船；`playerFleet` 和 `spreadX` 布局已支持多舰
4. **Omni 护盾渲染**: `shieldType: 'Omni'` 的 hull 数据已定义，但 ShipModel 护盾渲染未区分 Front/Omni
5. **音效系统**: `utils/audio.ts` 有 `playClickSound()` 占位，可扩展
6. **3D星图**: `StarMap3D.tsx` 已存在但未使用，可替换/补充 2D 星图
7. **海盗势力更多模板**: `getEnemiesForDanger()` 可返回更多变体
8. **索引优化**: 当前 `enemyWeaponMaps` 在 600 tick 的模拟中每 tick 重复查找武器数据，可提前提取
