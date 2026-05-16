// ฟังก์ชันสำหรับแปลงชื่ออาชีพเป็น URL ของรูปภาพ
export function getJobIconUrl(jobName: string): string {
    const job = (jobName || '').toLowerCase().trim();

    // ตรวจสอบชื่ออาชีพและส่งคืนชื่อไฟล์รูปภาพที่ตรงกัน
    // รองรับการพิมพ์ผิดเล็กน้อย หรือชื่อเรียกที่ต่างกัน
    if (job === 'paladin') return '/icons/jobs/paladin.png';
    if (['assassin'].includes(job)) return '/icons/jobs/Assassin.png';
    if (job === 'wizard') return '/icons/jobs/High Wizard.png';
    if (['champion'].includes(job)) return '/icons/jobs/champion.png';
    if (job === 'priest') return '/icons/jobs/priest.png';
    if (job === 'bard') return '/icons/jobs/minstrel.png';
    if (job === 'gypsy') return '/icons/jobs/gypsy.png';
    if (job === 'sniper') return '/icons/jobs/sniper.png';
    if (['biochemist', 'creator'].includes(job)) return '/icons/jobs/biochemist.png';
    if (['mastersmith', 'whitesmith'].includes(job)) return '/icons/jobs/mastersmith.png';
    if (job === 'sage') return '/icons/jobs/professor.png';
    if (['lord knight'].includes(job)) return '/icons/jobs/Lord Knight.png';
    if (job === 'rogue') return '/icons/jobs/rogue.png';
    if (job === 'summoner') return '/icons/jobs/summoner.png';

    // รูปภาพ Default กรณีสะกดชื่ออาชีพไม่ตรงหรือไม่พบรูป
    return '/icons/jobs/default.png';
}