# Lab 1 — Peer Review Record  (fill this in)

**Author:** Thananun Krungtui — 67070507203 — GitHub: @thananun-7203
**Peer reviewer:** Peepipat Suesoongnuen — 67070507207 — GitHub: @Peepipat-Suesoongnuen

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| [#5](https://github.com/thananun-7203/toktickit/pull/5) | feature/1-project-foundation | Approve and merge |
| [#6](https://github.com/thananun-7203/toktickit/pull/6) | feature/2-health-check | Approve and merge |
| [#7](https://github.com/thananun-7203/toktickit/pull/7) | feature/3-category-seed | Approve and merge |
| [#8](https://github.com/thananun-7203/toktickit/pull/8) | feature/4-category-list | Approve and merge |

Reviewer comment I received: ขอไฟล์ tests.md ด้วยครับ จะได้ตรวจสอบว่ารันผ่านจริงมั้ย

How I responded: ได้อัปเดต tests.md พร้อม output จริงแล้วครับ
เพิ่มผลลัพธ์ลงตาราง Test (API-01: Pass)
แนบหลักฐานภาพ evidence-server / evidence-client / ตัวอย่างหน้าเว็บไว้ใน docs/lab-01/images/
รบกวน review อีกครั้งครับ @Peepipat-Suesoongnuen

## Pull Requests I reviewed for my partner
My comment: จากการตรวจสอบ Issue 4

โดยรวมผ่านตาม acceptance criteria ครบถ้วน

GET /api/categories อ่านจาก PostgreSQL ผ่าน Prisma คืน { id, name } เรียงตาม id
Supertest ตรวจ 200 และได้ 4 หมวดหมู่ตามที่ seed ไว้
client เรียก API จริงแทนการ hard-code
มี success state (Online + รายการ) และ error state (Offline + ข้อความ) พร้อม Vitest
error จาก server ตอบข้อความปลอดภัย ไม่รั่วรายละเอียดภายใน
.env และ node_modules ไม่ถูก commit
แนะนำเพิ่มเติม
ควรมีภาพแสดงใน tests.md ในส่วนของ ui-offline เพื่อยืนยันว่าระบบมีการจัดการเมื่อเซิร์ฟเวอร์ล่ม (Offline) โดยแสดงข้อความแจ้งเตือน

Partner's response: ได้เพิ่มหลักฐานหน้าเว็บจริงตอน Offline (ui-offline.png) ใน tests.md แล้ว ตามที่แนะนำ
ตอนนี้ครบทุกข้อแล้ว ยังไงช่วย merge ให้หน่อยครับ
