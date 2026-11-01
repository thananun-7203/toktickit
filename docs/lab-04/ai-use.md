# Lab 4 AI Use — TokTickIT

This record summarizes how AI assistance was used during the TokTickIT Lab 4 work. The summaries below describe the main prompts and tasks; they are not presented as verbatim transcripts.

## Models and tools

- **Models:** ChatGPT (GPT-6) and Gemini Pro.
- **Development and repository tools:** ComGu Core and ComGu Desktop were used to inspect and work with the local repository. Git and GitHub were used to manage branches, Issues, Pull Requests, reviews, and CI evidence.
- **Verification tools:** Playwright, the project test/build commands, Prisma, and isolated PostgreSQL test databases were used to verify implementation and regression behavior. Development database data was treated as protected and was not used for test writes.
- AI-generated suggestions and code were treated as proposals. Repository state, test output, CI results, and reviewer feedback were checked before recording a result as verified.

## Selected key prompts (10)

| # | Prompt (summarised) | What I did with the result |
| - | --- | --- |
| 1 | "อ่านและทำความเข้าใจโจทย์ Lab 4 แล้ววางแผนการทำงานทั้งหมดอย่างละเอียด" — วิเคราะห์ข้อกำหนดและแบ่งงานออกเป็น Issues พร้อมวางลำดับการทำงาน | ใช้แผนเป็นกรอบจัดลำดับงานของ Sprint 4 และตรวจสอบว่างานแต่ละ Issue มีขอบเขตและเป้าหมายชัดเจน |
| 2 | "ตรวจสอบ Lab 3 baseline และ Git history ก่อนเริ่มทำ Lab 4" — สำรวจโค้ด โครงสร้างฐานข้อมูล API, Auth, UI และ tests ที่มีอยู่ | ใช้ข้อมูลจาก repository จริงเพื่อให้การออกแบบ Lab 4 ต่อเนื่องกับระบบเดิม ไม่สร้างกฎหรือรูปแบบใหม่ที่ขัดแย้งกับ Lab 3 |
| 3 | "เตรียม `lab4-staging` และสร้าง Issues ตามแผนก่อน โดยยังไม่เริ่มพัฒนา" — แยกการเตรียมงานออกจากการลงมือ implement | ตรวจสอบ branch, Issues และ baseline ก่อนเริ่มแต่ละงาน โดยไม่ให้ AI ข้ามขั้นตอนที่ยังไม่ได้รับอนุญาต |
| 4 | "วางแผน Issue โดยเชื่อม Acceptance Criteria, Definition of Done, tests และ evidence ก่อนเขียนโค้ด" — กำหนดขอบเขตและวิธีตรวจสอบผลลัพธ์ | ใช้แผนเป็น checklist ระหว่างพัฒนาและตรวจสอบว่างานที่ทำตอบโจทย์และมีหลักฐานรองรับ |
| 5 | "ทำ mockup สำหรับหน้าจอที่เกี่ยวข้อง โดยคงโครงสร้างและธีมเดิมของ TokTickIT แล้วรอให้ตรวจสอบก่อน implement" — เตรียม UI สำหรับตรวจทั้ง Desktop และ Mobile | ตรวจ mockup กับหน้าตาและรูปแบบเดิมของระบบก่อนอนุมัติให้เริ่มพัฒนา ลดความเสี่ยงจากการเปลี่ยน UX โดยไม่จำเป็น |
| 6 | "ดำเนินการตาม Issue และ contract ที่อนุมัติ พร้อมตรวจ backend, frontend และ tests ที่เกี่ยวข้อง" — พัฒนางานตามขอบเขตของแต่ละ Issue | ใช้ AI ช่วย implement และเพิ่ม regression tests โดยตรวจผลกับ contract และพฤติกรรมเดิมของระบบ ไม่พิจารณาเฉพาะกรณีที่ทำงานสำเร็จ |
| 7 | "ตรวจสอบผล tests, E2E, CI และหลักฐาน โดยแยกสิ่งที่ผ่านจริงออกจากสิ่งที่ยังไม่ยืนยัน" — ตรวจความน่าเชื่อถือของผลทดสอบและเอกสาร | ใช้ผลตรวจสอบแก้ไข test หรือ evidence ที่ไม่ครบถ้วน และไม่กล่าวอ้างว่า test หรือ release gate ผ่านหากไม่มีผลยืนยัน |
| 8 | "วิเคราะห์ Review จาก Tanaboonnnnn แล้วแก้ไขตามข้อเสนอแนะ โดยหยุดรอก่อน Commit, Push หรือขอ Review รอบใหม่" — ประเมิน feedback เทียบกับ specification และหลักฐาน | ใช้ review comments เป็นรายการตรวจสอบและแก้ไข พร้อมรักษา Human Checkpoint ให้ฉันตรวจการเปลี่ยนแปลงก่อนทำ GitHub side effects สำคัญ |
| 9 | "ตรวจสอบการทำงานของ Lab 4 E2E บนฐานข้อมูลทดสอบที่แยกจาก Development DB และยืนยันว่า test guard ป้องกันการเขียนข้อมูลผิดฐาน" — ตรวจการตั้งค่า PostgreSQL สำหรับ E2E, migration, seed และการทำงานของ database guard | ใช้ผลทดสอบกับฐานข้อมูล E2E ที่แยกไว้เพื่อยืนยัน regression โดยไม่เขียนหรือ reset ข้อมูลใน Development DB และบันทึกเฉพาะจำนวน test ที่รันผ่านจริง |
| 10 | "ปรับ `evidence.md` และ `reviewer.md` ของ Lab 4 ให้มีโครงสร้างและระดับรายละเอียดตามตัวอย่าง Lab 3 โดยใช้เฉพาะหลักฐานที่ตรวจสอบได้" — จัดหมวดหลักฐานและบันทึก Peer Review โดยระบุ Tanaboonnnnn เป็น reviewer เพียงคนเดียว | ใช้รูปแบบ Lab 3 เป็นแนวทางในการจัดเอกสาร แต่คงสถานะ PR/CI ตามข้อเท็จจริง แยกงานที่ยังรอออกจากงานที่เสร็จแล้ว และไม่สร้างหลักฐานหรือผล Review ขึ้นเอง |

## Reflection

ในการใช้ AI มาช่วยเขียน Spec.md จะมีประโยชน์สูงสุดก็ต่อเมื่อเราตีกรอบให้มันทำงานโดยอ้างอิงจาก 2 แหล่งข้อมูลไปพร้อมๆกัน คือโจทย์ของ Lab 4 และโค้ด Lab 3 ที่ใช้งานอยู่ เพราะถ้าปล่อยให้มันอ่านแค่โจทย์ใหม่อย่างเดียว มันมีโอกาสสูงมากที่จะไปตั้งกฎที่ขัดแย้งกับของเดิม ทั้งเรื่อง Ownership, Auth, ระบบ Comment, ไฟล์แนบ หรือพฤติกรรมของ Response ต่างๆ ดังนั้น การให้ AI เข้าไปเช็กโค้ดใน Repo ก่อน จะช่วยให้ Contract ของ Sprint 4 ออกมาในรูปแบบที่ไปทางเดียวกันและใช้งานได้จริงมากขึ้น และในส่วนของพวก API, Migration หรือ UI ที่มันเสนอมา ก็สามารถจับเอา Pattern เดิมที่เรามีอยู่แล้วไปใช้ซ้ำได้เลย ไม่ต้องมานั่งออกแบบระบบใหม่ให้ซ้ำซ้อน

ส่วนการควบคุมที่สำคัญที่สุด คือเราต้องมีจุดคอยเบรก (Human Checkpoint) เพื่อคุมสโคปและการจัดการ Git ซึ่งผมจะสั่งให้ AI หยุดรอการตัดสินใจจากผมเป็นระยะๆ เช่น หยุดหลังจากวางแผนเสร็จ หยุดหลังจากเซ็ต Branch/Issue ให้เช็ก Baseline เดิมก่อนเริ่มดราฟต์งาน และเบรกทุกครั้งก่อนจะสั่ง Commit หรือเปิด PR วิธีนี้ช่วยลดความเสี่ยงที่ AI จะมโนเขียนอะไรแปลกๆ แล้วถูกบันทึกกลายเป็นประวัติของโปรเจกต์ทันที ทำให้งานดูไม่เรียบร้อย
