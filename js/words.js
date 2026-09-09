/**
 * نقاشباشی (Naghash Bashi) - Persian Word Bank & Normalization Engine
 * Contains 210+ categorized Persian words with difficulties,
 * masking logic, letter hint generation, and Persian guess evaluation.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WordBank = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Comprehensive list of 210+ Persian words categorized with difficulties
  const WORDS = [
    // --- ۱. اشیا و ابزار (Objects & Tools) ---
    { word: 'سیب', category: 'اشیا و خوراکی', difficulty: 'easy' },
    { word: 'قاشق', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'ساعت', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'چتر', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'کفش', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'مداد', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'کتاب', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'توپ', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'بادکنک', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'صندلی', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'میز', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'عینک', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'کلید', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'شمع', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'تلفن', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'دوچرخه', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'مسواک', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'گیتار', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'قیچی', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'دوربین', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'چمدان', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'هدفون', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'کتری', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'آینه', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'گلدان', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'چکش', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'اره', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'نردبان', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'جاروبرقی', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'تلسکوپ', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'میکروسکوپ', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'ماشین لباسشویی', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'اتو بخار', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'چرخ خیاطی', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'فانوس دریایی', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'هلی‌کوپتر', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'قطب‌نما', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'تردمیل', category: 'اشیا و ابزار', difficulty: 'hard' },

    // --- ۲. خوراکی‌ها و نوشیدنی‌ها (Food & Beverages) ---
    { word: 'نان', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'موز', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پنیر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'تخم‌مرغ', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'شیر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'بستنی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'هویج', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'انگور', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پیتزا', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'هندوانه', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'ساندویچ', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'فنجان چای', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'ماکارونی', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'کیک تولد', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'پرتقال', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'توت‌فرنگی', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'خیارشور', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'انار', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'سیب‌زمینی سرخ‌کرده', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'قورمه‌سبزی', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'کباب کوبیده', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'آش رشته', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'باقلوا', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'فالوده شیرازی', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'پشمک', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'دیزی سنگی', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'نان بربری', category: 'خوراکی‌ها', difficulty: 'hard' },

    // --- ۳. حیوانات و طبیعت (Animals & Nature) ---
    { word: 'گربه', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'سگ', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'ماهی', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'درخت', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'خورشید', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'ماه', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'ستاره', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'شیر جنگل', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'مار', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'گل رز', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'فیل', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'خرگوش', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'لاک‌پشت', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'دلفین', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'طوطی', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'پنگوئن', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'قورباغه', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'سنجاب', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'رنگین‌کمان', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'آبشار', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'آتشفشان', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'زرافه', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'طاووس', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'خرس پاندا', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'اختاپوس', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'جوجه‌تیغی', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'کانگورو', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'اسب آبی', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'شترمرغ', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'کوسه سفید', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'کرگدن', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'پروانه خالدار', category: 'حیوانات و طبیعت', difficulty: 'hard' },

    // --- ۴. مشاغل، اشخاص و تکنولوژی (Jobs, Characters & Tech) ---
    { word: 'پلیس', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'دکتر', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'معلم', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'ربات', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'موشک', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'لپ‌تاپ', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'نانوا', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'خلبان', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'آتش‌نشان', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'نقاش', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'سرآشپز', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'نینجا', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'نجار', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'تبلت', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'پهپاد', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'عکاس', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'برنامه‌نویس', category: 'مشاغل و تکنولوژی', difficulty: 'hard' },
    { word: 'فضانورد', category: 'مشاغل و فضا', difficulty: 'hard' },
    { word: 'کارآگاه', category: 'مشاغل و افراد', difficulty: 'hard' },
    { word: 'دندان‌پزشک', category: 'مشاغل و افراد', difficulty: 'hard' },
    { word: 'شعبده‌باز', category: 'مشاغل و افراد', difficulty: 'hard' },
    { word: 'غواص دریا', category: 'مشاغل و افراد', difficulty: 'hard' },
    { word: 'هوش مصنوعی', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'ماهواره مخابراتی', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'چاپگر سه‌بعدی', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'خودروی برقی', category: 'تکنولوژی', difficulty: 'hard' },

    // --- ۵. اماکن، وسایل نقلیه و ساختمان‌ها (Places & Vehicles) ---
    { word: 'خانه', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'اتوبوس', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'قایق', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'قطار', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'مدرسه', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'هواپیما', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'پل', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'بیمارستان', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'کشتی تفریحی', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'پارک بازی', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'زیردریایی', category: 'اماکن و وسایل نقلیه', difficulty: 'hard' },
    { word: 'برج میلاد', category: 'اماکن و وسایل نقلیه', difficulty: 'hard' },
    { word: 'میدان آزادی', category: 'اماکن و وسایل نقلیه', difficulty: 'hard' },
    { word: 'ایستگاه فضایی', category: 'اماکن و وسایل نقلیه', difficulty: 'hard' },
    { word: 'قلعه تاریخی', category: 'اماکن و وسایل نقلیه', difficulty: 'hard' },
    { word: 'کوه دماوند', category: 'اماکن و طبیعت', difficulty: 'hard' },

    // --- ۶. افعال، حالات و ضرب‌المثل‌ها (Actions, Concepts & Idioms) ---
    { word: 'خوابیدن', category: 'افعال و مفاهیم', difficulty: 'easy' },
    { word: 'خندیدن', category: 'افعال و مفاهیم', difficulty: 'easy' },
    { word: 'دویدن', category: 'افعال و مفاهیم', difficulty: 'easy' },
    { word: 'گریه کردن', category: 'افعال و مفاهیم', difficulty: 'medium' },
    { word: 'آواز خواندن', category: 'افعال و مفاهیم', difficulty: 'medium' },
    { word: 'پرواز کردن', category: 'افعال و مفاهیم', difficulty: 'medium' },
    { word: 'ماهیگیری', category: 'افعال و مفاهیم', difficulty: 'medium' },
    { word: 'اسکی روی برف', category: 'افعال و ورزش', difficulty: 'medium' },
    { word: 'شنا کردن', category: 'افعال و ورزش', difficulty: 'medium' },
    { word: 'فوتبال بازی کردن', category: 'افعال و ورزش', difficulty: 'medium' },
    { word: 'آشپزی کردن', category: 'افعال و مفاهیم', difficulty: 'medium' },
    { word: 'کوهنوردی', category: 'افعال و ورزش', difficulty: 'medium' },
    { word: 'پرش با چتر', category: 'افعال و مفاهیم', difficulty: 'hard' },
    { word: 'موج‌سواری', category: 'افعال و ورزش', difficulty: 'hard' },
    { word: 'سنگ مفت گنجشک مفت', category: 'ضرب‌المثل', difficulty: 'hard' },
    { word: 'قطره قطره جمع گردد', category: 'ضرب‌المثل', difficulty: 'hard' },
    { word: 'شتر دیدی ندیدی', category: 'ضرب‌المثل', difficulty: 'hard' },
    { word: 'فیل هوا کردن', category: 'ضرب‌المثل', difficulty: 'hard' },
    { word: 'دسته گل به آب دادن', category: 'ضرب‌المثل', difficulty: 'hard' },

    // --- اضافه واژگان متنوع جهت تنوع بی‌نهایت در بازی ---
    { word: 'تراش', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'پاک‌کن', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'بادبزن', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'کوزه', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'قفس', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'پرچم', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'تختخواب', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'پنجره', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'دیوار', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'چاقو', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'چنگال', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'بشقاب', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'لیوان', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'کبریت', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'جارو دستی', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'بیل', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'سطل آب', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'شیر آب', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'صابون', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'حوله', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'شانه مو', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'شلوار', category: 'پوشاک', difficulty: 'easy' },
    { word: 'پیراهن', category: 'پوشاک', difficulty: 'easy' },
    { word: 'جوراب', category: 'پوشاک', difficulty: 'easy' },
    { word: 'کلاه لبه‌دار', category: 'پوشاک', difficulty: 'medium' },
    { word: 'دستکش زمستانی', category: 'پوشاک', difficulty: 'medium' },
    { word: 'کمربند', category: 'پوشاک', difficulty: 'medium' },
    { word: 'انگشتر', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'گردنبند', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'گوشواره', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'سکه طلا', category: 'اشیا ارزشمند', difficulty: 'medium' },
    { word: 'صندوقچه گنج', category: 'اشیا ارزشمند', difficulty: 'hard' },
    { word: 'تاج پادشاهی', category: 'اشیا ارزشمند', difficulty: 'medium' },
    { word: 'عصای جادویی', category: 'فانتزی', difficulty: 'medium' },
    { word: 'شمشیر', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'سپر', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'کمان تیراندازی', category: 'ورزش و ابزار', difficulty: 'hard' },
    { word: 'تیر و کمان', category: 'ورزش و ابزار', difficulty: 'medium' },
    { word: 'دارت', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'شطرنج', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'تاس بازی', category: 'بازی و سرگرمی', difficulty: 'easy' },
    { word: 'پازل', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'یویو', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'فرفره', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'بادبادک', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'تاب بازی', category: 'بازی و سرگرمی', difficulty: 'easy' },
    { word: 'سرسره', category: 'بازی و سرگرمی', difficulty: 'easy' },
    { word: 'الاکلنگ', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'استخر توپ', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'چرخ و فلک', category: 'شهربازی', difficulty: 'hard' },
    { word: 'قطار وحشت', category: 'شهربازی', difficulty: 'hard' },
    { word: 'اتومبیل تصادفی', category: 'شهربازی', difficulty: 'hard' },
    { word: 'سینما', category: 'اماکن', difficulty: 'medium' },
    { word: 'موزه', category: 'اماکن', difficulty: 'medium' },
    { word: 'فرودگاه', category: 'اماکن', difficulty: 'hard' },
    { word: 'پمپ بنزین', category: 'اماکن', difficulty: 'medium' },
    { word: 'بانک ملت', category: 'اماکن', difficulty: 'medium' },
    { word: 'دستگاه عابربانک', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'کارت بانکی', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'کاکتوس', category: 'گیاهان', difficulty: 'medium' },
    { word: 'قارچ سمی', category: 'گیاهان', difficulty: 'medium' },
    { word: 'بلوط', category: 'گیاهان', difficulty: 'medium' },
    { word: 'برگ درخت پاییزی', category: 'طبیعت', difficulty: 'medium' },
    { word: 'رعد و برق', category: 'طبیعت', difficulty: 'medium' },
    { word: 'گردباد', category: 'طبیعت', difficulty: 'hard' },
    { word: 'زلزله', category: 'طبیعت', difficulty: 'hard' },
    { word: 'سیلاب', category: 'طبیعت', difficulty: 'hard' },
    { word: 'برف و آدم‌برفی', category: 'طبیعت و زمستان', difficulty: 'medium' },
    { word: 'شفق قطبی', category: 'طبیعت', difficulty: 'hard' },
    { word: 'جنگل بارانی', category: 'طبیعت', difficulty: 'hard' },
    { word: 'صحرا و بیابان', category: 'طبیعت', difficulty: 'medium' },
    { word: 'اقیانوس', category: 'طبیعت', difficulty: 'medium' },
    { word: 'جزیره ناشناخته', category: 'طبیعت', difficulty: 'hard' },
    { word: 'غار تاریک', category: 'طبیعت', difficulty: 'medium' },
    { word: 'چشمه آب گرم', category: 'طبیعت', difficulty: 'hard' },
    { word: 'سد خاکی', category: 'سازه‌ها', difficulty: 'hard' },
    { word: 'تونل قطار', category: 'سازه‌ها', difficulty: 'medium' }
  ];

  /**
   * Persian text normalizer for accurate, fair guess evaluation.
   */
  function normalizePersian(text) {
    if (!text || typeof text !== 'string') return '';
    let s = text.trim().toLowerCase();

    // Replace zero-width spaces and ZWNJ with space to preserve word boundary
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, ' ');

    // Remove Tatweel / Kashida (ـ)
    s = s.replace(/\u0640/g, '');

    // Remove Arabic Harakat / Diacritics
    s = s.replace(/[\u064B-\u065F\u0670]/g, '');

    // Unify Persian / Arabic letter variants
    s = s
      .replace(/[يى]/g, 'ی')
      .replace(/[ك]/g, 'ک')
      .replace(/[ة]/g, 'ه')
      .replace(/[ؤ]/g, 'و')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/[ئ]/g, 'ی');

    // Remove common Persian/English punctuation
    s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?!،«»"']/g, ' ');

    // Normalize multiple spaces into single space
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  }

  /**
   * Normalized comparison without spaces (so 'برنامه نویس' equals 'برنامه‌نویس' and 'برنامهنویس')
   */
  function normalizeCompact(text) {
    return normalizePersian(text).replace(/\s+/g, '');
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Check if user's guess matches the target word.
   */
  function checkGuess(guess, targetWord) {
    if (!guess || !targetWord) return { isCorrect: false, isClose: false };

    const normGuess = normalizeCompact(guess);
    const normTarget = normalizeCompact(targetWord);

    if (normGuess === normTarget) {
      return { isCorrect: true, isClose: false };
    }

    // Check if close (Levenshtein distance == 1 for words with 4+ characters)
    if (normTarget.length >= 4) {
      const dist = levenshtein(normGuess, normTarget);
      if (dist === 1) {
        return { isCorrect: false, isClose: true };
      }
    }

    return { isCorrect: false, isClose: false };
  }

  /**
   * Generates a masked representation of a word for guessers.
   * Example: 'سیب' -> '_ _ _'
   * Example with letter revealed at index 1: 'س _ _'
   */
  function getMaskedDisplay(word, revealedIndices = new Set()) {
    if (!word) return '';
    const chars = Array.from(word);
    const masked = chars.map((ch, idx) => {
      if (ch === ' ' || ch === '‌' || ch === '-') {
        return '   '; // Visible gap for word separation
      }
      if (revealedIndices && (revealedIndices.has(idx) || (typeof revealedIndices.includes === 'function' && revealedIndices.includes(idx)))) {
        return ch;
      }
      return '_';
    });
    return masked.join(' ');
  }

  /**
   * Selects an unrevealed letter index for hint system
   */
  function getNextHintIndex(word, alreadyRevealed = new Set()) {
    const chars = Array.from(word);
    const candidates = [];
    chars.forEach((ch, idx) => {
      const isAlready = alreadyRevealed instanceof Set ? alreadyRevealed.has(idx) : Array.isArray(alreadyRevealed) ? alreadyRevealed.includes(idx) : false;
      if (ch !== ' ' && ch !== '‌' && ch !== '-' && !isAlready) {
        candidates.push(idx);
      }
    });
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Pick 3 words of varying difficulty for the drawer to choose from.
   * Excludes recently used words to prevent repetition.
   */
  function pickWordChoices(usedWordList = []) {
    const usedSet = new Set(usedWordList);
    const available = WORDS.filter(w => !usedSet.has(w.word));
    const pool = available.length >= 3 ? available : WORDS;

    const easyPool = pool.filter(w => w.difficulty === 'easy');
    const medPool = pool.filter(w => w.difficulty === 'medium');
    const hardPool = pool.filter(w => w.difficulty === 'hard');

    const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];

    const easy = easyPool.length ? getRandom(easyPool) : getRandom(pool);
    let med = medPool.length ? getRandom(medPool) : getRandom(pool);
    let hard = hardPool.length ? getRandom(hardPool) : getRandom(pool);

    // Ensure uniqueness among 3 choices
    const choices = [easy];
    if (med.word !== easy.word) {
      choices.push(med);
    } else {
      const alt = pool.find(w => w.word !== easy.word);
      choices.push(alt || { word: 'دوچرخه', category: 'اشیا', difficulty: 'medium' });
    }

    const currentWords = new Set(choices.map(c => c.word));
    const third = pool.find(w => !currentWords.has(w.word)) || { word: 'برنامه‌نویس', category: 'تکنولوژی', difficulty: 'hard' };
    choices.push(third);

    return choices;
  }

  return {
    WORDS,
    normalizePersian,
    normalizeCompact,
    levenshtein,
    checkGuess,
    getMaskedDisplay,
    getNextHintIndex,
    pickWordChoices
  };
});
