# AuctionWindow.tsx - คำอธิบาย

## ภาพรวม

`components/auction/AuctionWindow.tsx` เป็น React client component สำหรับแสดง auction dashboard ของระบบ

- แสดงได้ 3 โหมด: `slots`, `queue`, `history`
- ใช้ทั้งสำหรับผู้ใช้ทั่วไปและแอดมิน
- รับข้อมูลผ่าน props จาก parent component แล้ว render UI ตามข้อมูลนั้น
- มี action สำหรับแอดมิน เช่น award, edit, delete queue

---

## โครงสร้างไฟล์

### Imports
- `Image` จาก `next/image`
- `Dispatch`, `SetStateAction`, `useState` จาก React
- `ITEM_CONFIG` จาก `./constants`
- action functions:
  - `awardAuctionQueue`
  - `deleteAuctionQueueReservation`
  - `updateAuctionQueueReservation`

### Type definitions

#### `AuctionItemType`
รองรับประเภทไอเทม:
- `Album`
- `Puppet`
- `White`
- `RedBlack`

#### `AuctionSlot`
โครงสร้างของ slot แต่ละรายการ:
- `id`
- `type`
- `icon`
- `color`
- `assignedTo`
- `uid?`
- `queueId?`
- `requestedQty?`
- `receivedQty?`
- `remainingQty?`
- `status?`
- `isMe?`
- `isEmpty?`
- `isCompleted?`

`isCompleted` เป็น optional property ที่ช่วยให้ component ตรวจสอบสถานะ completed ของ slot ได้โดยตรง

#### `AuctionHistoryEntry`
โครงสร้างข้อมูลประวัติ:
- `id`
- `item_name`
- `display_name`
- `uid_game`
- `awarded_qty`
- `requested_qty`
- `status`
- `note?`
- `awarded_at?`

#### `AuctionWindowProps`
Props ที่ component นี้รับ:
- `isAdmin`
- `history?`
- `memberQueues?`
- `mappedSlots`
- `activeSubTab`
- `setActiveSubTab`
- `currentPage`
- `setCurrentPage`
- `totalPages`
- `currentSlots`
- `onRefresh`
- `isSaving`
- `limits?`
- `positions?`

---

## State ภายใน component

- `viewMode`
  - ควบคุมโหมดการแสดงผล
  - ค่าเป็น `'slots' | 'history' | 'queue'`
- `actionLoading`
  - เก็บสถานะ loading ของปุ่มตาม `queueId`
- `confirmedSlots`
  - เก็บ optimistic update เมื่อ admin กดแจกของ
  - ใช้เพื่อให้ UI เปลี่ยนก่อนจะ refresh ใหม่
- `editQueueId`
  - id ของ queue ที่กำลังแก้ไข
- `editQty`
  - จำนวนใหม่ใน modal แก้ไข
- `editLoading`
  - สถานะ loading ของ modal

---

## ฟังก์ชันหลัก

### `editingQueue`
```ts
const editingQueue = editQueueId ? memberQueues.find(q => q.id === editQueueId) : undefined
```
- หา queue ที่กำลังแก้ไขจาก `memberQueues`

### `closeEditModal()`
- รีเซ็ต state ที่เกี่ยวข้องกับ modal edit
- ปิด modal

### `handleSaveEdit()`
- ตรวจสอบ input
- ต้องไม่ต่ำกว่า `received_qty`
- เรียก `updateAuctionQueueReservation`
- ถ้า success -> ปิด modal และเรียก `onRefresh()`

---

## ฟังก์ชัน render สำคัญ

### `renderSlotRow(slot, index)`
นี่คือฟังก์ชันที่สร้าง row ของ slot แต่ละช่อง

#### คำนวณค่า local
- `confirmed`
  - ดูจาก `confirmedSlots[slot.id]`
- `localReceived`
  - `(slot.receivedQty ?? 0) + (confirmed?.awardedQty ?? 0)`
- `hasReserve`
  - ถ้า slot ไม่ว่างและมี `requestedQty`
- `localRemaining`
  - `Math.max((slot.remainingQty ?? 0) - (confirmed?.awardedQty ?? 0), 0)`
- `localStatus`
  - ถ้า `slot.isEmpty` => `'waiting'`
  - ถ้ามี `confirmed.status` => ใช้ค่านั้น
  - ถ้ามี `slot.status` => ใช้ค่านั้น
  - ถ้าไม่มี => fallback จาก `localRemaining === 0`

#### แสดงผล slot
- ถ้า `slot.isEmpty`
  - แสดงกล่อง “เปิดว่างให้กดอิสระ”
- ถ้าไม่ว่าง
  - แสดง badge สถานะ
  - แสดงจำนวนนัดจอง / ได้แล้ว / คงเหลือ
  - ถ้าเป็น admin แล้วมี `queueId`
    - แสดงปุ่ม `ประมูล`
    - เรียก action `awardAuctionQueue`

### สถานะ `computedCompleted`
```ts
const computedCompleted = typeof slot.isCompleted === 'boolean'
  ? slot.isCompleted
  : (typeof slot.receivedQty === 'number' && typeof slot.requestedQty === 'number')
    ? slot.receivedQty >= slot.requestedQty
    : false
```
- ถ้ามี `slot.isCompleted` ให้ใช้ค่านั้น
- ถ้าไม่มี ให้ fallback ตรวจจาก `receivedQty >= requestedQty`

---

## แสดง Modal แก้ไข

### `renderEditModal()`
- เมื่อ `editingQueue` มีค่าจะเปิด modal
- มี input จำนวนใหม่
- ปุ่มบันทึกเรียก `handleSaveEdit()`
- ปุ่มยกเลิกปิด modal

---

## UI หลักใน `return`

### Header
- ปุ่มเลือก view mode
- ปุ่ม refresh `onRefresh`

### มุมมองหลัก 3 แบบ

#### 1. `viewMode === 'slots'`
- แสดง tab item type
- แสดง list `currentSlots`
- มี pagination

#### 2. `viewMode === 'queue'`
- แสดง `memberQueues`
- ถ้าเป็น admin
  - ปุ่มแก้ไข
  - ปุ่มลบ
- ถ้าไม่ใช่ admin
  - แสดงข้อความบอกว่า admin จะจัดคิว

#### 3. `viewMode === 'history'`
- แสดงประวัติการประมูลจาก `history`

---

## Behavior สำคัญ

- `AuctionWindow` ไม่ได้คำนวณ allocation ของช่องเองทั้งหมด
  - มันรับ `mappedSlots` และ `currentSlots` มาแล้ว
- `confirmedSlots` ใช้เพื่อแสดงการ award แบบชั่วคราวก่อน `refresh`
- `isCompleted` ถูกเพิ่มเพื่อรองรับสถานะตรงๆ ถ้ามีข้อมูลจาก parent
- admin สามารถ:
  - award queue
  - edit queue ผ่าน modal
  - delete queue (ในมุมมอง queue)

---

## ข้อควรระวัง / จุดที่ต้องสังเกต

- ต้องแน่ใจว่า `memberQueues` ถูกส่งมาจาก parent
- `currentSlots` ควรเป็น slice ของ `mappedSlots`
- `onRefresh()` ควร refresh ข้อมูลจริงจาก server
- `confirmedSlots` จะช่วยให้ UI ไม่กระพริบเวลากด award

---

## สรุปภาพรวม

`AuctionWindow.tsx` คือ:
- dashboard viewer สำหรับ auction
- มีทั้ง view slot / queue / history
- มี admin action
- มี fallback status logic
- ใช้ props เป็นข้อมูลหลัก แล้ว render UI ตามนั้น
