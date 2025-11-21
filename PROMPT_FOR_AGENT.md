# Промпт для агента: Исправление системы управления графами

## Контекст проекта

Это React-приложение для визуализации и управления графами модулей и доменных областей. Приложение использует:
- **Frontend**: React + TypeScript + Vite, UI библиотека @consta/uikit
- **Backend**: Node.js + Express + SQLite (sql.js)
- **База данных**: SQLite с таблицами для хранения графов и их данных

## Архитектура хранения данных

### Структура базы данных

База данных SQLite хранится в `server/data/graph.db` и содержит следующие таблицы:

1. **graphs** - основная таблица графов:
   - `id` (TEXT PRIMARY KEY) - UUID графа
   - `name` (TEXT NOT NULL) - название графа
   - `is_default` (INTEGER) - флаг основного графа (0 или 1)
   - `created_at` (TEXT) - дата создания ISO
   - `updated_at` (TEXT) - дата обновления ISO

2. **graph_metadata** - метаданные графов (версия snapshot, layout и т.д.)

3. **domains** - домены (иерархическая структура):
   - `graph_id` (TEXT) - ссылка на граф
   - `id`, `name`, `description`, `parent_id`, `position`

4. **modules** - модули:
   - `graph_id` (TEXT) - ссылка на граф
   - `id`, `position`, `data` (JSON строка)

5. **artifacts** - артефакты:
   - `graph_id` (TEXT) - ссылка на граф
   - `id`, `position`, `data` (JSON строка)

6. **initiative_rows** - инициативы:
   - `graph_id` (TEXT) - ссылка на граф
   - `id`, `position`, `data` (JSON строка)

7. **experts** - эксперты:
   - `graph_id` (TEXT) - ссылка на граф
   - `id`, `position`, `data` (JSON строка)

**Важно**: Все таблицы данных имеют `graph_id` и связаны с графом через FOREIGN KEY с ON DELETE CASCADE.

### Ключевые файлы

#### Backend (server/)

1. **`server/graphStore.ts`** - основная логика работы с БД:
   - `createGraph(options)` - создание нового графа (строки 141-192)
   - `loadSnapshot(graphId)` - загрузка snapshot графа (строки 222-350)
   - `writeSnapshot(database, graphId, snapshot)` - сохранение snapshot (строки 797-884)
   - `listGraphs()` - список всех графов
   - `deleteGraph(graphId)` - удаление графа

2. **`server/index.ts`** - Express сервер:
   - API endpoint: `POST /api/graphs` - создание графа
   - API endpoint: `GET /api/graphs` - список графов
   - API endpoint: `GET /api/graphs/:id` - загрузка snapshot графа
   - API endpoint: `DELETE /api/graphs/:id` - удаление графа

#### Frontend (src/)

1. **`src/App.tsx`** - главный компонент приложения:
   - `handleSubmitCreateGraph()` (строки 3146-3233) - обработка создания графа
   - `loadSnapshot()` (строки 472-591) - загрузка snapshot с сервера
   - `applySnapshot()` (строки 368-470) - применение snapshot к UI
   - `refreshGraphs()` (строки 669-759) - обновление списка графов
   - `updateActiveGraph()` (строки 591-665) - переключение активного графа

2. **`src/components/CreateGraphModal.tsx`** - модальное окно создания графа:
   - Поле ввода названия графа
   - Select для выбора источника (или "Создать пустой граф")
   - CheckboxGroup для выбора типов данных для копирования (domains, modules, artifacts, experts, initiatives)

3. **`src/components/GraphPersistenceControls.tsx`** - компонент управления графами:
   - Select для выбора активного графа
   - Кнопки создания/удаления графов
   - Отображение статуса синхронизации

4. **`src/services/graphStorage.ts`** - API клиент:
   - `createGraph(payload)` - запрос на создание графа
   - `fetchGraphSummaries()` - получение списка графов
   - `fetchGraphSnapshot(graphId)` - получение snapshot графа

## Текущая проблема

### Проблема 1: Пустой граф создается не пустым

**Симптомы:**
- Пользователь создает граф без выбора источника (выбирает "Создать пустой граф")
- Граф создается, но при загрузке содержит данные (домены, модули и т.д.)

**Текущая логика (src/App.tsx, строки 3176-3181):**
```typescript
// Если источник не выбран, создаем полностью пустой граф
const includeDomains = graphSourceIdDraft ? graphCopyOptions.has('domains') : false;
const includeModules = graphSourceIdDraft ? graphCopyOptions.has('modules') : false;
const includeArtifacts = graphSourceIdDraft ? graphCopyOptions.has('artifacts') : false;
const includeExperts = graphSourceIdDraft ? graphCopyOptions.has('experts') : false;
const includeInitiatives = graphSourceIdDraft ? graphCopyOptions.has('initiatives') : false;
```

**Логика на бэкенде (server/graphStore.ts, строки 159-178):**
```typescript
if (options.sourceGraphId) {
  const sourceSnapshot = loadSnapshot(options.sourceGraphId);
  const snapshot: GraphSnapshotPayload = {
    // ... копирование данных из sourceSnapshot
  };
  writeSnapshot(database, graphId, snapshot);
} else {
  updateGraphTimestamp(graphId, now, database);
  // НЕ создается snapshot - граф должен быть пустым
}
```

**Проблема:** Когда граф создается без `sourceGraphId`, snapshot не записывается в БД. Но при загрузке пустого графа через `loadSnapshot()`, функция возвращает пустые массивы для всех типов данных. Однако, возможно, проблема в том, что при применении пустого snapshot в `applySnapshot()` используются текущие данные из состояния, если snapshot пустой.

**Нужно проверить:**
- Что возвращает `loadSnapshot()` для пустого графа (должны быть пустые массивы)
- Как `applySnapshot()` обрабатывает пустые массивы
- Не происходит ли fallback на локальные данные по умолчанию

### Проблема 2: Не работает выбор графов

**Симптомы:**
- Пользователь выбирает граф в выпадающем списке
- Выбор не применяется, граф не переключается

**Текущая логика (src/components/GraphPersistenceControls.tsx):**
- `handleGraphSelectChange()` (строки 284-290) - вызывается при изменении выбора
- `useEffect()` (строки 310-328) - синхронизирует `selectedGraphId` с `activeGraphId`

**Возможные причины:**
- `useEffect` может перезаписывать выбор пользователя до того, как `updateActiveGraph` успеет выполниться
- Проблема с асинхронностью обновления состояния

## Требования к решению

### Что должно работать:

1. **Создание пустого графа:**
   - Пользователь нажимает "Создать граф"
   - В модальном окне НЕ выбирает источник (оставляет placeholder "Создать пустой граф")
   - Нажимает "Создать граф"
   - Граф создается в БД БЕЗ данных (пустые таблицы domains, modules, artifacts, experts, initiatives)
   - При переключении на этот граф отображается пустой граф (нет доменов, модулей и т.д.)

2. **Создание графа с копированием:**
   - Пользователь выбирает источник графа
   - Выбирает типы данных для копирования (checkbox'ы)
   - Граф создается с выбранными данными из источника
   - При переключении на этот граф отображаются скопированные данные

3. **Выбор и переключение графов:**
   - Пользователь выбирает граф в выпадающем списке
   - Граф сразу переключается
   - Загружается snapshot выбранного графа
   - Отображаются данные выбранного графа

4. **Хранение данных:**
   - Каждый граф хранится изолированно в БД (через `graph_id`)
   - При удалении графа удаляются все связанные данные (ON DELETE CASCADE)
   - Изменения в одном графе не влияют на другие графы

## Типы данных

### GraphSnapshotPayload (src/types/graph.ts):
```typescript
{
  version?: number;
  exportedAt?: string;
  domains: DomainNode[];
  modules: ModuleNode[];
  artifacts: ArtifactNode[];
  experts?: ExpertProfile[];
  initiatives?: InitiativeNode[];
  layout?: GraphLayoutSnapshot;
  scopesIncluded?: GraphDataScope[];
}
```

### GraphSummary:
```typescript
{
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

## API Endpoints

### POST /api/graphs
**Request body:**
```json
{
  "name": "Название графа",
  "sourceGraphId": "uuid-источника" | null,
  "includeDomains": boolean,
  "includeModules": boolean,
  "includeArtifacts": boolean,
  "includeExperts": boolean,
  "includeInitiatives": boolean
}
```

**Response:** GraphSummary

### GET /api/graphs
**Response:** GraphSummary[]

### GET /api/graphs/:id
**Response:** GraphSnapshotPayload

### DELETE /api/graphs/:id
**Response:** 204 No Content

## Важные детали реализации

1. **Создание пустого графа:**
   - Когда `sourceGraphId === null`, все `include*` должны быть `false`
   - На бэкенде не вызывается `writeSnapshot()`, только `updateGraphTimestamp()`
   - В БД создается запись в таблице `graphs`, но НЕТ записей в таблицах данных

2. **Загрузка пустого графа:**
   - `loadSnapshot()` для пустого графа должна возвращать объект с пустыми массивами:
     ```typescript
     {
       domains: [],
       modules: [],
       artifacts: [],
       experts: [],
       initiatives: [],
       layout: undefined
     }
     ```
   - `applySnapshot()` должна применять эти пустые массивы, очищая текущие данные

3. **Выбор графа:**
   - При выборе графа вызывается `updateActiveGraph(graphId)`
   - Это должно вызвать `loadSnapshot(graphId)` с `withOverlay: true`
   - После загрузки вызывается `applySnapshot(snapshot)`

## Что нужно исправить

1. **Убедиться, что пустой граф действительно пустой:**
   - Проверить, что `loadSnapshot()` для пустого графа возвращает пустые массивы
   - Проверить, что `applySnapshot()` правильно обрабатывает пустые массивы
   - Убедиться, что нет fallback на локальные данные по умолчанию

2. **Исправить выбор графов:**
   - Убедиться, что `handleGraphSelectChange` правильно вызывает `onGraphSelect`
   - Проверить, что `useEffect` не перезаписывает выбор пользователя
   - Убедиться, что `updateActiveGraph` корректно обрабатывает переключение

3. **Тестирование:**
   - Создать пустой граф → проверить, что он пустой в БД → проверить, что он отображается пустым
   - Создать граф с копированием → проверить, что данные скопированы → проверить отображение
   - Выбрать граф в списке → проверить, что он переключается → проверить загрузку данных

## Дополнительная информация

- Порт фронтенда: 3003
- Порт бэкенда: 4000
- База данных: `server/data/graph.db` (SQLite)
- Локальный граф (fallback): `LOCAL_GRAPH_ID = 'local-graph'` - используется при недоступности сервера

## Команды для запуска

```bash
# Запуск фронтенда и бэкенда одновременно
npm run dev:full

# Или отдельно:
npm run dev      # фронтенд на :3003
npm run server   # бэкенд на :4000
```

