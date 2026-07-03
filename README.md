# คำนวณเงินเดือนคร่าวๆ

เว็บแอปแบบ Static สำหรับบันทึกเวลาและประเมินเงินเดือนรายงวดแบบไม่เป็นทางการ

## ไฟล์ที่ต้องอัปโหลดขึ้น GitHub Pages

อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ไว้ที่ root ของ repository:

- `index.html`
- `manifest.json`
- `service-worker.js`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `favicon.png`

## Deploy ด้วย GitHub Pages

1. สร้าง repository ใหม่บน GitHub
2. อัปโหลดไฟล์ทั้งหมดไว้ที่ root ของ repository
3. ไปที่ Settings → Pages
4. เลือก Branch เป็น `main` และ Folder เป็น `/ (root)`
5. กด Save แล้วรอ URL ของ GitHub Pages สักครู่

## หมายเหตุ

- แอปนี้ใช้ `localStorage` เก็บข้อมูลในเครื่องผู้ใช้ ข้อมูลไม่ได้ซิงก์ข้ามเครื่อง
- หากแก้ไฟล์แล้วมือถือยังเห็นหน้าเดิม ให้เปลี่ยนค่า `CACHE_NAME` ใน `service-worker.js` เช่น `payroll-estimator-v2`
- ไอคอนใหม่ออกแบบให้สื่อว่าเป็น PAY + เครื่องคิดเลข + งวด 16–15 + EST. เพื่อบอกว่าเป็นการประเมินคร่าวๆ
