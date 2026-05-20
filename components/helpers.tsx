// ฟังก์ชันสำหรับแปลงชื่ออาชีพเป็น URL ของรูปภาพ
export function getJobIconUrl(jobName: string): string {
    const job = (jobName || '').toLowerCase().trim();

    // ตรวจสอบชื่ออาชีพและส่งคืนชื่อไฟล์รูปภาพที่ตรงกัน
    // รองรับการพิมพ์ผิดเล็กน้อย หรือชื่อเรียกที่ต่างกัน
    if (job === 'paladin') return '/icons/jobs/Paladin.png';
    if (['assassin'].includes(job)) return '/icons/jobs/Assassin.png';
    if (job === 'wizard') return '/icons/jobs/High Wizard.png';
    if (['champion'].includes(job)) return '/icons/jobs/Champion.png';
    if (job === 'priest') return '/icons/jobs/Priest.png';
    if (job === 'bard') return '/icons/jobs/Minstrel.png';
    if (job === 'gypsy') return '/icons/jobs/Gypsy.png';
    if (job === 'sniper') return '/icons/jobs/Sniper.png';
    if (['biochemist', 'creator'].includes(job)) return '/icons/jobs/Biochemist.png';
    if (['mastersmith', 'whitesmith'].includes(job)) return '/icons/jobs/Mastersmith.png';
    if (job === 'sage') return '/icons/jobs/Professor.png';
    if (['lord knight'].includes(job)) return '/icons/jobs/Lord Knight.png';
    if (job === 'rogue') return '/icons/jobs/Stalker.png';
    if (job === 'summoner') return '/icons/jobs/Summoner.png';

    // รูปภาพ Default กรณีสะกดชื่ออาชีพไม่ตรงหรือไม่พบรูป
    return '/icons/jobs/default.png';
}