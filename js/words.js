/**
 * نقاش‌باشی (Naghash Bashi) - Persian Word Bank & Normalization Engine
 * Contains 500+ pure single-piece categorized Persian words with difficulties,
 * masking logic, letter hint generation, and Persian guess evaluation.
 * STRICT POLICY: ZERO multi-part, compound, spaced, or hyphenated words.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WordBank = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Pure single-piece Persian words (strictly 1 word, zero spaces, zero ZWNJ, zero hyphens)
  const WORDS = [
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
    { word: 'تردمیل', category: 'اشیا و ابزار', difficulty: 'hard' },
    { word: 'نان', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'موز', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پنیر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'شیر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'بستنی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'هویج', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'انگور', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پیتزا', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'هندوانه', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'ساندویچ', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'ماکارونی', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'پرتقال', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'خیارشور', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'انار', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'باقلوا', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'پشمک', category: 'خوراکی‌ها', difficulty: 'hard' },
    { word: 'گربه', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'سگ', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'ماهی', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'درخت', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'خورشید', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'ماه', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'ستاره', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'مار', category: 'حیوانات و طبیعت', difficulty: 'easy' },
    { word: 'فیل', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'خرگوش', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'دلفین', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'طوطی', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'پنگوئن', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'قورباغه', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'سنجاب', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'آبشار', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'آتشفشان', category: 'حیوانات و طبیعت', difficulty: 'medium' },
    { word: 'زرافه', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'طاووس', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'اختاپوس', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'کانگورو', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'شترمرغ', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'کرگدن', category: 'حیوانات و طبیعت', difficulty: 'hard' },
    { word: 'پلیس', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'دکتر', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'معلم', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'ربات', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'موشک', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'نانوا', category: 'مشاغل و افراد', difficulty: 'easy' },
    { word: 'خلبان', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'نقاش', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'سرآشپز', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'نینجا', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'نجار', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'تبلت', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'پهپاد', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'عکاس', category: 'مشاغل و افراد', difficulty: 'medium' },
    { word: 'فضانورد', category: 'مشاغل و فضا', difficulty: 'hard' },
    { word: 'کارآگاه', category: 'مشاغل و افراد', difficulty: 'hard' },
    { word: 'خانه', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'اتوبوس', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'قایق', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'قطار', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'مدرسه', category: 'اماکن و وسایل نقلیه', difficulty: 'easy' },
    { word: 'هواپیما', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'پل', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'بیمارستان', category: 'اماکن و وسایل نقلیه', difficulty: 'medium' },
    { word: 'زیردریایی', category: 'اماکن و وسایل نقلیه', difficulty: 'hard' },
    { word: 'خوابیدن', category: 'افعال و مفاهیم', difficulty: 'easy' },
    { word: 'خندیدن', category: 'افعال و مفاهیم', difficulty: 'easy' },
    { word: 'دویدن', category: 'افعال و مفاهیم', difficulty: 'easy' },
    { word: 'ماهیگیری', category: 'افعال و مفاهیم', difficulty: 'medium' },
    { word: 'کوهنوردی', category: 'افعال و ورزش', difficulty: 'medium' },
    { word: 'تراش', category: 'اشیا و ابزار', difficulty: 'easy' },
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
    { word: 'بیل', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'صابون', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'حوله', category: 'اشیا و ابزار', difficulty: 'easy' },
    { word: 'شلوار', category: 'پوشاک', difficulty: 'easy' },
    { word: 'پیراهن', category: 'پوشاک', difficulty: 'easy' },
    { word: 'جوراب', category: 'پوشاک', difficulty: 'easy' },
    { word: 'کمربند', category: 'پوشاک', difficulty: 'medium' },
    { word: 'انگشتر', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'گردنبند', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'گوشواره', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'شمشیر', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'سپر', category: 'اشیا و ابزار', difficulty: 'medium' },
    { word: 'دارت', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'شطرنج', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'پازل', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'یویو', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'فرفره', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'بادبادک', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'سرسره', category: 'بازی و سرگرمی', difficulty: 'easy' },
    { word: 'الاکلنگ', category: 'بازی و سرگرمی', difficulty: 'medium' },
    { word: 'سینما', category: 'اماکن', difficulty: 'medium' },
    { word: 'موزه', category: 'اماکن', difficulty: 'medium' },
    { word: 'فرودگاه', category: 'اماکن', difficulty: 'hard' },
    { word: 'کاکتوس', category: 'گیاهان', difficulty: 'medium' },
    { word: 'بلوط', category: 'گیاهان', difficulty: 'medium' },
    { word: 'گردباد', category: 'طبیعت', difficulty: 'hard' },
    { word: 'زلزله', category: 'طبیعت', difficulty: 'hard' },
    { word: 'سیلاب', category: 'طبیعت', difficulty: 'hard' },
    { word: 'اقیانوس', category: 'طبیعت', difficulty: 'medium' },
    { word: 'بالش', category: 'اشیا و خانه', difficulty: 'easy' },
    { word: 'فرش', category: 'اشیا و خانه', difficulty: 'easy' },
    { word: 'لامپ', category: 'اشیا و خانه', difficulty: 'easy' },
    { word: 'پنکه', category: 'اشیا و خانه', difficulty: 'easy' },
    { word: 'بخاری', category: 'اشیا و خانه', difficulty: 'medium' },
    { word: 'کولر', category: 'اشیا و خانه', difficulty: 'medium' },
    { word: 'یخچال', category: 'اشیا و خانه', difficulty: 'easy' },
    { word: 'تلویزیون', category: 'اشیا و دیجیتال', difficulty: 'easy' },
    { word: 'پتو', category: 'اشیا و خانه', difficulty: 'easy' },
    { word: 'چمنزار', category: 'طبیعت', difficulty: 'easy' },
    { word: 'همبرگر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'موتورسیکلت', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'گیلاس', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'آلبالو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'هلو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'شلیل', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'گلابی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'انجیر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'خرما', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'زردآلو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'طالبی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'خربزه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'گرمک', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'نارگیل', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'آناناس', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'نارنگی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'لیمو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کیوی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'تمشک', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'توت', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'خیار', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'گوجه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پیاز', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'سیر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کدو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'بادمجان', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'فلفل', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کاهو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کلم', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'بروکلی', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'قارچ', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'ذرت', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'نخود', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'لوبیا', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'عدس', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'لپه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'برنج', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'گندم', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'جو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کره', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'خامه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'ماست', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'دوغ', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'شکلات', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'بیسکویت', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کیک', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'شیرینی', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'برگر', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'سوسیس', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کالباس', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'املت', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'سوپ', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'آش', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'کباب', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'جوجه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'فسنجان', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'قورمه', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'قیمه', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'دلمه', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'کوفته', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'لازانیا', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'سالاد', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'ژله', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'فالوده', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'سوهان', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'گز', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'باوا', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'زولبیا', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'بامیه', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'حلوا', category: 'خوراکی‌ها', difficulty: 'medium' },
    { word: 'آبنبات', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'لواشک', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'آلوچه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پسته', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'بادام', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'فندق', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'گردو', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'تخمه', category: 'خوراکی‌ها', difficulty: 'easy' },
    { word: 'پلنگ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'یوزپلنگ', category: 'حیوانات', difficulty: 'medium' },
    { word: 'ببر', category: 'حیوانات', difficulty: 'easy' },
    { word: 'گرگ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'روباه', category: 'حیوانات', difficulty: 'easy' },
    { word: 'خرس', category: 'حیوانات', difficulty: 'easy' },
    { word: 'اسب', category: 'حیوانات', difficulty: 'easy' },
    { word: 'گاو', category: 'حیوانات', difficulty: 'easy' },
    { word: 'گوسفند', category: 'حیوانات', difficulty: 'easy' },
    { word: 'بز', category: 'حیوانات', difficulty: 'easy' },
    { word: 'شتر', category: 'حیوانات', difficulty: 'easy' },
    { word: 'الاغ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'قاطر', category: 'حیوانات', difficulty: 'medium' },
    { word: 'میمون', category: 'حیوانات', difficulty: 'easy' },
    { word: 'گوریل', category: 'حیوانات', difficulty: 'easy' },
    { word: 'شامپانزه', category: 'حیوانات', difficulty: 'medium' },
    { word: 'موش', category: 'حیوانات', difficulty: 'easy' },
    { word: 'همستر', category: 'حیوانات', difficulty: 'easy' },
    { word: 'خارپشت', category: 'حیوانات', difficulty: 'medium' },
    { word: 'کفتار', category: 'حیوانات', difficulty: 'medium' },
    { word: 'شغال', category: 'حیوانات', difficulty: 'medium' },
    { word: 'پرنده', category: 'حیوانات', difficulty: 'easy' },
    { word: 'گنجشک', category: 'حیوانات', difficulty: 'easy' },
    { word: 'کبوتر', category: 'حیوانات', difficulty: 'easy' },
    { word: 'عقاب', category: 'حیوانات', difficulty: 'easy' },
    { word: 'شاهین', category: 'حیوانات', difficulty: 'medium' },
    { word: 'کرکس', category: 'حیوانات', difficulty: 'medium' },
    { word: 'قناری', category: 'حیوانات', difficulty: 'easy' },
    { word: 'بلبل', category: 'حیوانات', difficulty: 'medium' },
    { word: 'کلاغ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'زاغ', category: 'حیوانات', difficulty: 'medium' },
    { word: 'جغد', category: 'حیوانات', difficulty: 'easy' },
    { word: 'مرغابی', category: 'حیوانات', difficulty: 'medium' },
    { word: 'اردک', category: 'حیوانات', difficulty: 'easy' },
    { word: 'غاز', category: 'حیوانات', difficulty: 'easy' },
    { word: 'قو', category: 'حیوانات', difficulty: 'easy' },
    { word: 'فلامینگو', category: 'حیوانات', difficulty: 'medium' },
    { word: 'هدهد', category: 'حیوانات', difficulty: 'medium' },
    { word: 'خروس', category: 'حیوانات', difficulty: 'easy' },
    { word: 'مرغ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'بوقلمون', category: 'حیوانات', difficulty: 'medium' },
    { word: 'کوسه', category: 'حیوانات', difficulty: 'easy' },
    { word: 'نهنگ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'خرچنگ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'میگو', category: 'حیوانات', difficulty: 'easy' },
    { word: 'وزغ', category: 'حیوانات', difficulty: 'medium' },
    { word: 'سوسمار', category: 'حیوانات', difficulty: 'medium' },
    { word: 'تمساح', category: 'حیوانات', difficulty: 'easy' },
    { word: 'مارمولک', category: 'حیوانات', difficulty: 'easy' },
    { word: 'حلزون', category: 'حیوانات', difficulty: 'easy' },
    { word: 'پروانه', category: 'حیوانات', difficulty: 'easy' },
    { word: 'زنبور', category: 'حیوانات', difficulty: 'easy' },
    { word: 'مورچه', category: 'حیوانات', difficulty: 'easy' },
    { word: 'مگس', category: 'حیوانات', difficulty: 'easy' },
    { word: 'پشه', category: 'حیوانات', difficulty: 'easy' },
    { word: 'عنکبوت', category: 'حیوانات', difficulty: 'easy' },
    { word: 'عقرب', category: 'حیوانات', difficulty: 'easy' },
    { word: 'سوسک', category: 'حیوانات', difficulty: 'easy' },
    { word: 'ملخ', category: 'حیوانات', difficulty: 'easy' },
    { word: 'کرم', category: 'حیوانات', difficulty: 'easy' },
    { word: 'ماشین', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'خودرو', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'تاکسی', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'کامیون', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'وانت', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'تریلی', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'موتور', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'اسکوتر', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'اسکیت', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'مترو', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'تراموا', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'هلیکوپتر', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'پاراموتور', category: 'وسایل نقلیه', difficulty: 'hard' },
    { word: 'گلایدر', category: 'وسایل نقلیه', difficulty: 'hard' },
    { word: 'بالن', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'فضاپیما', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'ماهواره', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'کشتی', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'ناوبر', category: 'وسایل نقلیه', difficulty: 'hard' },
    { word: 'ناو', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'لنج', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'تراکتور', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'بولدوزر', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'جرثقیل', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'آمبولانس', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'فرغون', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'درشکه', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'کالسکه', category: 'وسایل نقلیه', difficulty: 'easy' },
    { word: 'سورتمه', category: 'وسایل نقلیه', difficulty: 'medium' },
    { word: 'سیاره', category: 'طبیعت', difficulty: 'easy' },
    { word: 'شهاب', category: 'طبیعت', difficulty: 'medium' },
    { word: 'آسمان', category: 'طبیعت', difficulty: 'easy' },
    { word: 'ابر', category: 'طبیعت', difficulty: 'easy' },
    { word: 'باران', category: 'طبیعت', difficulty: 'easy' },
    { word: 'برف', category: 'طبیعت', difficulty: 'easy' },
    { word: 'تگرگ', category: 'طبیعت', difficulty: 'medium' },
    { word: 'رعدوبرق', category: 'طبیعت', difficulty: 'medium' },
    { word: 'صاعقه', category: 'طبیعت', difficulty: 'medium' },
    { word: 'طوفان', category: 'طبیعت', difficulty: 'easy' },
    { word: 'باد', category: 'طبیعت', difficulty: 'easy' },
    { word: 'نسیم', category: 'طبیعت', difficulty: 'medium' },
    { word: 'مه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'کوه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'قله', category: 'طبیعت', difficulty: 'easy' },
    { word: 'تپه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'صخره', category: 'طبیعت', difficulty: 'easy' },
    { word: 'غار', category: 'طبیعت', difficulty: 'easy' },
    { word: 'دره', category: 'طبیعت', difficulty: 'medium' },
    { word: 'دشت', category: 'طبیعت', difficulty: 'easy' },
    { word: 'کویر', category: 'طبیعت', difficulty: 'easy' },
    { word: 'بیابان', category: 'طبیعت', difficulty: 'easy' },
    { word: 'جنگل', category: 'طبیعت', difficulty: 'easy' },
    { word: 'برگ', category: 'طبیعت', difficulty: 'easy' },
    { word: 'شاخه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'ریشه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'جوانه', category: 'طبیعت', difficulty: 'medium' },
    { word: 'گل', category: 'طبیعت', difficulty: 'easy' },
    { word: 'چمن', category: 'طبیعت', difficulty: 'easy' },
    { word: 'سبزه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'بوته', category: 'طبیعت', difficulty: 'easy' },
    { word: 'خار', category: 'طبیعت', difficulty: 'easy' },
    { word: 'دریا', category: 'طبیعت', difficulty: 'easy' },
    { word: 'موج', category: 'طبیعت', difficulty: 'easy' },
    { word: 'ساحل', category: 'طبیعت', difficulty: 'easy' },
    { word: 'ماسه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'رودخانه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'جویبار', category: 'طبیعت', difficulty: 'medium' },
    { word: 'چشمه', category: 'طبیعت', difficulty: 'medium' },
    { word: 'دریاچه', category: 'طبیعت', difficulty: 'easy' },
    { word: 'مرداب', category: 'طبیعت', difficulty: 'medium' },
    { word: 'باتلاق', category: 'طبیعت', difficulty: 'medium' },
    { word: 'جزیره', category: 'طبیعت', difficulty: 'easy' },
    { word: 'بهمن', category: 'طبیعت', difficulty: 'medium' },
    { word: 'سیل', category: 'طبیعت', difficulty: 'medium' },
    { word: 'سونامی', category: 'طبیعت', difficulty: 'hard' },
    { word: 'آتش', category: 'طبیعت', difficulty: 'easy' },
    { word: 'شعله', category: 'طبیعت', difficulty: 'easy' },
    { word: 'دود', category: 'طبیعت', difficulty: 'easy' },
    { word: 'خاکستر', category: 'طبیعت', difficulty: 'medium' },
    { word: 'سنگ', category: 'طبیعت', difficulty: 'easy' },
    { word: 'شن', category: 'طبیعت', difficulty: 'easy' },
    { word: 'خاک', category: 'طبیعت', difficulty: 'easy' },
    { word: 'پزشک', category: 'مشاغل', difficulty: 'easy' },
    { word: 'پرستار', category: 'مشاغل', difficulty: 'easy' },
    { word: 'جراح', category: 'مشاغل', difficulty: 'medium' },
    { word: 'دندانپزشک', category: 'مشاغل', difficulty: 'medium' },
    { word: 'داروساز', category: 'مشاغل', difficulty: 'medium' },
    { word: 'استاد', category: 'مشاغل', difficulty: 'easy' },
    { word: 'دانشجو', category: 'مشاغل', difficulty: 'easy' },
    { word: 'مدیر', category: 'مشاغل', difficulty: 'easy' },
    { word: 'سرباز', category: 'مشاغل', difficulty: 'easy' },
    { word: 'ملوان', category: 'مشاغل', difficulty: 'easy' },
    { word: 'ناخدا', category: 'مشاغل', difficulty: 'medium' },
    { word: 'راننده', category: 'مشاغل', difficulty: 'easy' },
    { word: 'آشپز', category: 'مشاغل', difficulty: 'easy' },
    { word: 'قصاب', category: 'مشاغل', difficulty: 'easy' },
    { word: 'آهنگر', category: 'مشاغل', difficulty: 'medium' },
    { word: 'بنا', category: 'مشاغل', difficulty: 'easy' },
    { word: 'خیاط', category: 'مشاغل', difficulty: 'easy' },
    { word: 'بافنده', category: 'مشاغل', difficulty: 'medium' },
    { word: 'کشاورز', category: 'مشاغل', difficulty: 'easy' },
    { word: 'باغبان', category: 'مشاغل', difficulty: 'easy' },
    { word: 'چوپان', category: 'مشاغل', difficulty: 'easy' },
    { word: 'شکارچی', category: 'مشاغل', difficulty: 'medium' },
    { word: 'ماهیگیر', category: 'مشاغل', difficulty: 'easy' },
    { word: 'مهماندار', category: 'مشاغل', difficulty: 'medium' },
    { word: 'امدادگر', category: 'مشاغل', difficulty: 'medium' },
    { word: 'رفتگر', category: 'مشاغل', difficulty: 'medium' },
    { word: 'پستچی', category: 'مشاغل', difficulty: 'easy' },
    { word: 'نگهبان', category: 'مشاغل', difficulty: 'easy' },
    { word: 'سرایدار', category: 'مشاغل', difficulty: 'medium' },
    { word: 'قاضی', category: 'مشاغل', difficulty: 'medium' },
    { word: 'وکیل', category: 'مشاغل', difficulty: 'medium' },
    { word: 'نویسنده', category: 'مشاغل', difficulty: 'medium' },
    { word: 'شاعر', category: 'مشاغل', difficulty: 'medium' },
    { word: 'خبرنگار', category: 'مشاغل', difficulty: 'medium' },
    { word: 'گوینده', category: 'مشاغل', difficulty: 'medium' },
    { word: 'مجری', category: 'مشاغل', difficulty: 'medium' },
    { word: 'بازیگر', category: 'مشاغل', difficulty: 'easy' },
    { word: 'کارگردان', category: 'مشاغل', difficulty: 'medium' },
    { word: 'خواننده', category: 'مشاغل', difficulty: 'easy' },
    { word: 'نوازنده', category: 'مشاغل', difficulty: 'medium' },
    { word: 'ورزشکار', category: 'مشاغل', difficulty: 'easy' },
    { word: 'فوتبالیست', category: 'مشاغل', difficulty: 'easy' },
    { word: 'داور', category: 'مشاغل', difficulty: 'easy' },
    { word: 'مربی', category: 'مشاغل', difficulty: 'easy' },
    { word: 'غواص', category: 'مشاغل', difficulty: 'medium' },
    { word: 'دلقک', category: 'مشاغل', difficulty: 'easy' },
    { word: 'پادشاه', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'ملکه', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'شاهزاده', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'وزیر', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'سردار', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'فرمانده', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'جاسوس', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'دزد', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'راهزن', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'دزددریایی', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'جادوگر', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'دیو', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'غول', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'پری', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'فرشته', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'روح', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'هیولا', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'مومیایی', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'زامبی', category: 'شخصیت‌ها', difficulty: 'easy' },
    { word: 'سامورایی', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'شوالیه', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'گلادیاتور', category: 'شخصیت‌ها', difficulty: 'hard' },
    { word: 'کابوی', category: 'شخصیت‌ها', difficulty: 'medium' },
    { word: 'رایانه', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'کامپیوتر', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'موبایل', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'گوشی', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'مانیتور', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'کیبورد', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'ماوس', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'اسپیکر', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'هندزفری', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'میکروفون', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'وبکم', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'پرینتر', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'اسکنر', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'فلش', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'هارد', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'مودم', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'روتر', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'آنتن', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'باتری', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'شارژر', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'کابل', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'سیم', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'پریز', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'رادیو', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'پروژکتور', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'کنسول', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'دسته', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'بازی', category: 'تکنولوژی', difficulty: 'easy' },
    { word: 'دیسک', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'چیپ', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'پردازنده', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'مادربرد', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'کد', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'برنامه', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'سایت', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'اینترنت', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'ایمیل', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'پسورد', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'ویروس', category: 'تکنولوژی', difficulty: 'medium' },
    { word: 'رباتیک', category: 'تکنولوژی', difficulty: 'hard' },
    { word: 'کت', category: 'پوشاک', difficulty: 'easy' },
    { word: 'پالتو', category: 'پوشاک', difficulty: 'easy' },
    { word: 'کاپشن', category: 'پوشاک', difficulty: 'easy' },
    { word: 'بارانی', category: 'پوشاک', difficulty: 'medium' },
    { word: 'ژاکت', category: 'پوشاک', difficulty: 'medium' },
    { word: 'پلیور', category: 'پوشاک', difficulty: 'medium' },
    { word: 'هودی', category: 'پوشاک', difficulty: 'easy' },
    { word: 'تیشرت', category: 'پوشاک', difficulty: 'easy' },
    { word: 'دامن', category: 'پوشاک', difficulty: 'easy' },
    { word: 'لباس', category: 'پوشاک', difficulty: 'easy' },
    { word: 'چادر', category: 'پوشاک', difficulty: 'easy' },
    { word: 'روسری', category: 'پوشاک', difficulty: 'easy' },
    { word: 'شال', category: 'پوشاک', difficulty: 'easy' },
    { word: 'مقنعه', category: 'پوشاک', difficulty: 'easy' },
    { word: 'کلاه', category: 'پوشاک', difficulty: 'easy' },
    { word: 'دستکش', category: 'پوشاک', difficulty: 'easy' },
    { word: 'چکمه', category: 'پوشاک', difficulty: 'easy' },
    { word: 'پوتین', category: 'پوشاک', difficulty: 'medium' },
    { word: 'دمپایی', category: 'پوشاک', difficulty: 'easy' },
    { word: 'صندل', category: 'پوشاک', difficulty: 'easy' },
    { word: 'کراوات', category: 'پوشاک', difficulty: 'easy' },
    { word: 'پاپیون', category: 'پوشاک', difficulty: 'easy' },
    { word: 'جیب', category: 'پوشاک', difficulty: 'easy' },
    { word: 'دکمه', category: 'پوشاک', difficulty: 'easy' },
    { word: 'زیپ', category: 'پوشاک', difficulty: 'easy' },
    { word: 'یقه', category: 'پوشاک', difficulty: 'medium' },
    { word: 'آستین', category: 'پوشاک', difficulty: 'medium' },
    { word: 'حلقه', category: 'زیورآلات', difficulty: 'easy' },
    { word: 'دستبند', category: 'زیورآلات', difficulty: 'easy' },
    { word: 'النگو', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'تاج', category: 'زیورآلات', difficulty: 'easy' },
    { word: 'سنجاق', category: 'زیورآلات', difficulty: 'medium' },
    { word: 'مدال', category: 'زیورآلات', difficulty: 'easy' },
    { word: 'سر', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'مو', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'پیشانی', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'ابرو', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'مژه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'چشم', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'بینی', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'دماغ', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'گونه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'لب', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'دهان', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'دندان', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'زبان', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'چانه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'ریش', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'سبیل', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'گوش', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'گردن', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'شانه', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'کتف', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'بازو', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'آرنج', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'ساعد', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'مچ', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'دست', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'انگشت', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'ناخن', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'شست', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'سینه', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'شکم', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'ناف', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'پشت', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'کمر', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'پهلو', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'پا', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'ران', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'زانو', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'ساق', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'قوزک', category: 'اعضای بدن', difficulty: 'hard' },
    { word: 'پاشنه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'کف', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'قلب', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'مغز', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'ریه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'معده', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'کبد', category: 'اعضای بدن', difficulty: 'hard' },
    { word: 'کلیه', category: 'اعضای بدن', difficulty: 'hard' },
    { word: 'استخوان', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'اسکلت', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'جمجمه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'رگ', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'خون', category: 'اعضای بدن', difficulty: 'easy' },
    { word: 'پوست', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'عضله', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'ماهیچه', category: 'اعضای بدن', difficulty: 'medium' },
    { word: 'پیانو', category: 'موسیقی', difficulty: 'easy' },
    { word: 'ویولن', category: 'موسیقی', difficulty: 'easy' },
    { word: 'سنتور', category: 'موسیقی', difficulty: 'medium' },
    { word: 'تار', category: 'موسیقی', difficulty: 'medium' },
    { word: 'کمانچه', category: 'موسیقی', difficulty: 'medium' },
    { word: 'عود', category: 'موسیقی', difficulty: 'hard' },
    { word: 'دف', category: 'موسیقی', difficulty: 'easy' },
    { word: 'تنبک', category: 'موسیقی', difficulty: 'easy' },
    { word: 'طبل', category: 'موسیقی', difficulty: 'easy' },
    { word: 'درام', category: 'موسیقی', difficulty: 'medium' },
    { word: 'سنج', category: 'موسیقی', difficulty: 'medium' },
    { word: 'نی', category: 'موسیقی', difficulty: 'easy' },
    { word: 'فلوت', category: 'موسیقی', difficulty: 'easy' },
    { word: 'شیپور', category: 'موسیقی', difficulty: 'easy' },
    { word: 'ترومپت', category: 'موسیقی', difficulty: 'hard' },
    { word: 'ساکسیفون', category: 'موسیقی', difficulty: 'hard' },
    { word: 'سازدهنی', category: 'موسیقی', difficulty: 'medium' },
    { word: 'چنگ', category: 'موسیقی', difficulty: 'medium' },
    { word: 'قانون', category: 'موسیقی', difficulty: 'hard' },
    { word: 'دایره', category: 'موسیقی', difficulty: 'easy' },
    { word: 'زنگوله', category: 'موسیقی', difficulty: 'easy' },
    { word: 'سوت', category: 'موسیقی', difficulty: 'easy' },
    { word: 'فوتبال', category: 'ورزش', difficulty: 'easy' },
    { word: 'والیبال', category: 'ورزش', difficulty: 'easy' },
    { word: 'بسکتبال', category: 'ورزش', difficulty: 'easy' },
    { word: 'هندبال', category: 'ورزش', difficulty: 'medium' },
    { word: 'تنیس', category: 'ورزش', difficulty: 'easy' },
    { word: 'بدمینتون', category: 'ورزش', difficulty: 'medium' },
    { word: 'بیسبال', category: 'ورزش', difficulty: 'medium' },
    { word: 'گلف', category: 'ورزش', difficulty: 'easy' },
    { word: 'بولینگ', category: 'ورزش', difficulty: 'easy' },
    { word: 'بیلیارد', category: 'ورزش', difficulty: 'easy' },
    { word: 'پوکر', category: 'ورزش', difficulty: 'medium' },
    { word: 'مکعب', category: 'ورزش', difficulty: 'easy' },
    { word: 'لگو', category: 'ورزش', difficulty: 'easy' },
    { word: 'یوویو', category: 'ورزش', difficulty: 'medium' },
    { word: 'طناب', category: 'ورزش', difficulty: 'easy' },
    { word: 'هولاهوپ', category: 'ورزش', difficulty: 'medium' },
    { word: 'تاب', category: 'ورزش', difficulty: 'easy' },
    { word: 'ترامپولین', category: 'ورزش', difficulty: 'medium' },
    { word: 'شنا', category: 'ورزش', difficulty: 'easy' },
    { word: 'شیرجه', category: 'ورزش', difficulty: 'medium' },
    { word: 'واترپلو', category: 'ورزش', difficulty: 'hard' },
    { word: 'قایقرانی', category: 'ورزش', difficulty: 'medium' },
    { word: 'اسکی', category: 'ورزش', difficulty: 'easy' },
    { word: 'اسنوبورد', category: 'ورزش', difficulty: 'medium' },
    { word: 'پاتیناژ', category: 'ورزش', difficulty: 'hard' },
    { word: 'دو', category: 'ورزش', difficulty: 'easy' },
    { word: 'ماراتن', category: 'ورزش', difficulty: 'medium' },
    { word: 'پرش', category: 'ورزش', difficulty: 'easy' },
    { word: 'دمبل', category: 'ورزش', difficulty: 'easy' },
    { word: 'هالتر', category: 'ورزش', difficulty: 'medium' },
    { word: 'بوکس', category: 'ورزش', difficulty: 'easy' },
    { word: 'تکواندو', category: 'ورزش', difficulty: 'medium' },
    { word: 'کاراته', category: 'ورزش', difficulty: 'medium' },
    { word: 'جودو', category: 'ورزش', difficulty: 'medium' },
    { word: 'شمشیربازی', category: 'ورزش', difficulty: 'medium' },
    { word: 'تیراندازی', category: 'ورزش', difficulty: 'medium' },
    { word: 'کمان', category: 'ورزش', difficulty: 'easy' },
    { word: 'تیر', category: 'ورزش', difficulty: 'easy' },
    { word: 'زره', category: 'ورزش', difficulty: 'medium' },
    { word: 'خنجر', category: 'ورزش', difficulty: 'medium' },
    { word: 'چماق', category: 'ورزش', difficulty: 'medium' },
    { word: 'گرز', category: 'ورزش', difficulty: 'hard' },
    { word: 'نیزه', category: 'ورزش', difficulty: 'easy' },
    { word: 'در', category: 'ساختمان و مکان', difficulty: 'easy' },
    { word: 'سقف', category: 'ساختمان و مکان', difficulty: 'easy' },
    { word: 'حیاط', category: 'ساختمان و مکان', difficulty: 'easy' },
    { word: 'باغ', category: 'ساختمان و مکان', difficulty: 'easy' },
    { word: 'مسجد', category: 'ساختمان و مکان', difficulty: 'easy' },
    { word: 'دانشگاه', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'ایستگاه', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'رستوران', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'هتل', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'تئاتر', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'بانک', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'فروشگاه', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'داروخانه', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'نانوایی', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'قصابی', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'پارک', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'شهربازی', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'کارخانه', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'استادیوم', category: 'ساختمان و مکان', difficulty: 'medium' },
    { word: 'برج', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'قلعه', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'کاخ', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'زندان', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'پادگان', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'تونل', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'سد', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'آسیاب', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'دودکش', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'شومینه', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'پله', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'آسانسور', category: 'ساختمان و مکان', difficulty: 'hard' },
    { word: 'بالکن', category: 'ساختمان و مکان', difficulty: 'hard' }
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
    s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_~`()؟?!،«»"']/g, ' ');

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
      choices.push(alt || { word: 'دوچرخه', category: 'وسایل نقلیه', difficulty: 'medium' });
    }

    const currentWords = new Set(choices.map(c => c.word));
    const third = pool.find(w => !currentWords.has(w.word)) || { word: 'رایانه', category: 'تکنولوژی', difficulty: 'hard' };
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
