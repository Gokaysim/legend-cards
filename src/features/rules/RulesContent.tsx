import { type ReactNode, useId } from 'react'

import { RulesPicture } from './RulesPicture'

/**
 * One section of the rules: a region named by its title, separated from the one before by a line. Block layout, not
 * flex, so that its lines wrap around the floated `RulesPicture`.
 */
function RulesSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 border-t border-line pt-8 first:border-t-0 first:pt-0"
    >
      <h2 id={titleId} className="text-2xl font-semibold text-gold">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** A topic within a section. Its margin collapses with the one above it, so it is the whole space there. */
function Topic({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-lg font-semibold text-ink">{children}</h3>
}

function BulletList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6">{children}</ul>
}

/** A bold run inside a sentence. */
function Highlight({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-gold">{children}</strong>
}

/**
 * The table rules as the Cardmaker tells them, in four sections. The words are the DM's, from the legacy v2.2.8 rules
 * page, rewritten where they disagreed with the app (design D3 of `add-rules-page`): the draw chances, the packs and
 * mechanics with Blessed cards, the headings, and a few typos. The text describes the app's behavior in places, so a
 * change to draws or packs checks it (docs/domain.md, "The Kurallar screen follows the app").
 */
export function RulesContent() {
  return (
    // About 70 characters a line, so that on a wide window the corner Cardmaker stands beside the text, and a block
    // formatting context that holds the floated `card_info` picture (spec: rules-page, "Rules screen layout").
    <div
      data-rules-text
      className="flow-root max-w-[70ch] space-y-8 leading-relaxed break-words text-ink"
    >
      <RulesSection title="Legend Point Kart Sistemi">
        <RulesPicture />
        <p>
          Gel bakalım kuzum, otur şöyle yanıma. Şimdi sana bu güzelim kartların nasıl kullanıldığını
          bir güzel anlatayım. Kulaklarını aç da dinle, sonra gelip de "Cardmaker Teyzeciğim, ben
          bilmiyordum!" deme bana!
        </p>

        <Topic>Legend Point nasıl kazanılır?</Topic>
        <p>
          Evladım, oyunda öyle sıradan işler yaparak efsane olunmaz. Şöyle dillere destan bir şeyler
          yapacaksın! Unutulmayacak bir kahramanlık olur, tehlikeli bir macera olur, masadaki
          herkesin eğlencesine eğlence katacak bir marifet olur... İşte o zaman Legend Point
          kazanırsın, kuzum!
        </p>

        <Topic>Peki, bu puanlarla ne yapacağız?</Topic>
        <BulletList>
          <li>
            <Highlight>1 Legend Point</Highlight> harcayıp atacağın bir d20 zarına avantaj
            alabilirsin.
          </li>
          <li>
            <Highlight>1 Legend Point</Highlight> harcayıp bir kart çekebilirsin. Hem de benim kendi
            ellerimle hazırladığım kartlardan! Ay, ne güzel!
          </li>
          <li>
            Her kartı kullanmanın da kendine göre bir LP bedeli var, bu bedel kartın sol üst
            köşesinde yazıyor.
          </li>
        </BulletList>

        <Topic>Kart alışverişi nasıl oluyor?</Topic>
        <p>
          Bak şimdi canım, elindeki kartları diğer oyuncularla takas edebilirsin. Ama öyle hayrına
          kart dağıtmak yok! Vereceksen karşılığında bir kart alacaksın. Onun dışında dükkandan Card
          Pack açabilirsin, açtığın packten bir kart senin olur.
        </p>
        <p>
          Bir de kart çekme ve takas etme işlerini yalnızca oyun oturumunun başında veya sonunda
          yapabilirsiniz. Oyun ortasında pazarı kurmayın bana, hadi bakalım!
        </p>

        <Topic>Kartları ne zaman kullanabilirim?</Topic>
        <p>
          İşte burası güzel, evladım! Kartlarını oyun sırasında istediğin zaman kullanabilirsin.
          Hatta sıra başka bir oyuncudayken bile! Ama arkadaşlarının da tadını kaçırma, olur mu
          kuzum?
        </p>

        <Topic>Kullandığım kartlara ne oluyor?</Topic>
        <p>Kullandığın kartlar desteye gider, kuzum. Ama üzülme, sonra yeniden çekilebilirler.</p>

        <Topic>Şu kartların renkleri ne anlama geliyor?</Topic>
        <BulletList>
          <li>
            <Highlight>Mor çerçeveli kartlar:</Highlight> Bunlar Common kartlarımız, canım. Sık sık
            karşına çıkarlar. Ama sakın değersiz sanma, hepsi benim gözümün nuru!
          </li>
          <li>
            <Highlight>Altın çerçeveli kartlar:</Highlight> Aaaah, işte bunlar Rare kartlarımız!
            Öyle her yerde bulunmazlar. Kıymetini bil yavrum, kıymetini!
          </li>
          <li>
            <Highlight>Beyaz çerçeveli kartlar:</Highlight> Bunlar Blessed kartlar canım, tanrıların
            (ya da benim, keh keh) kutsamama sahip olduğunuzu gösterirler!
          </li>
          <li>
            <Highlight>Kırmızı çerçeveli kartlar:</Highlight> Cursed kartlar... Bunlar kötü etkiler
            barındırırlar, canım. Uzak durun demek istemem ama her ananın en sevdiği yavrusu, bir
            de... en az sevdiği yavrusu olur.
          </li>
        </BulletList>
      </RulesSection>

      <RulesSection title="Cursed Kartlar">
        <p>
          Bak şimdi kuzum, bazen attığın zar yüzüne gülmez, insanın bütün hevesi kaçar. Ama istersen
          bir Cursed kart çekip sonucunu beğenmediğin d20'yi bir daha atabilirsin! Ne güzel, değil
          mi? Ama eğer zarına 1 attıysan, o zaman iki tane Cursed kart çekmen gerekiyor.
        </p>
        <p>
          Tabii her güzel şeyin bir bedeli var evladım... Bu pazarlığı her oyuncu, her Encounter'da
          yalnızca bir kez yapabilir. Şeytanla da öyle habire pazarlık edilmez, sonra yüz bulur!
        </p>

        <Topic>Kart Çekmek</Topic>
        <p>
          Cursed kartların kendilerine ait ayrı bir destesi var, yavrum. Bunlar öyle normal Legend
          Point kartlarının arasından çıkmaz.
        </p>

        <Topic>Takas</Topic>
        <p>
          Aman kuzum, Cursed kartlarını başka oyuncularla ne takas edebilirsin ne de birine hediye
          edebilirsin. Öyle başına gelen musibeti komşunun kapısına bırakmak yok!
        </p>

        <Topic>Lanetten Kurtulmak</Topic>
        <p>
          Şimdi yavrum, bu lanetlerden kurtulmanın da bir yolu var elbet. Cursed kartını diğer
          kartlar gibi oynayıp elinden çıkarabilirsin. Ama dikkat et, kartı çektiğin Encounter
          sırasında kullanamazsın!
        </p>
        <p>
          Ha, bir de kart attıran etkilerle Cursed kartlarını elinden çıkarabilirsin. Bak, gördün
          mü? Her derdin bir çaresi var!
        </p>

        <Topic>Sonsuz Lanetler</Topic>
        <p>
          Common ve Rare kartların sayısı bellidir kuzum, ama Cursed kartların öyle değil! Bunlardan
          sonsuz tane var. Aynı lanet bir kere gelir, iki kere gelir, üç kere gelir... Ayol, kapıyı
          kapatsan bacadan girer! O yüzden aynı Cursed kartı defalarca çekebilirsin.
        </p>
      </RulesSection>

      <RulesSection title="Blessed Kart Kuralları">
        <Topic>Blessed Kartlar Nasıl Kazanılır?</Topic>
        <p>
          Aaah, benim güzel kuzum! Blessed kartlar öyle sıradan kartlar değildir. 1 Legend Point
          karşılığında kart çekerken karşına çıkabilirler, paketlerden bulabilirsin, hatta oyunda
          yaptığın güzel bir işin karşılığında sana bahşedilebilirler. Demek ki bazen talih de
          insanın yüzüne gülüyormuş!
        </p>

        <Topic>Blessed Kartların Nadirliği</Topic>
        <p>
          Bak evladım, Blessed kartlar benim en nadide yavrularımdır! Kart çekerken destedeki her
          kartın şansı eşittir, Blessed'lar da onların arasındadır. Ama sayıları öyle azdır ki
          karşına çıkarsa kıymetini bil!
        </p>
        <p>
          Ama sakın uyanıklık edip kart çektiren başka kartlarla Blessed aramaya kalkma! Olmaz öyle
          şey! Blessed kart yalnızca Legend Point harcayarak doğrudan kart çektiğinde karşına
          çıkabilir.
        </p>

        <Topic>Paketlerdeki Blessed Kartlar</Topic>
        <p>
          Blessed kartları Mechanic Pack'lerde, Golden Pack'lerde ve Pandemonium Pack'lerinde de
          bulabilirsin yavrum.
        </p>
        <p>
          Mechanic, Golden ve Pandemonium Pack'lerinde her kartın Blessed çıkma şansı %2'dir yavrum;
          Cursed paketlerde Blessed çıkmaz.
        </p>
        <p>
          Her Mechanic'in kendine ait Blessed kartları vardır. Bereket dediğin böyle olur işte.
          Maşallah!
        </p>

        <Topic>Bir Kutsama</Topic>
        <p>
          Şimdi kuzum, insanın gözü gönlü tok olacak. Her oyuncu yalnızca bir Blessed kart
          taşıyabilir. Yeni bir Blessed çekersen sadece birini tutabilirsin.
        </p>

        <Topic>Blessed Kartlar Neden Kaybolur?</Topic>
        <p>
          Ah yavrum ah... Güzel şeyler ne yazık ki pek uzun kalmıyor bu dünyada. Blessed kartlar da
          öyle.
        </p>
        <p>
          Cursed kart çekersen Blessed kartın seni terk eder. Lanetle kutsama aynı çatı altında
          barınmaz, kuzum!
        </p>
        <p>
          Level atlarsan da Blessed kartın gider. Artık kendi ayakların üzerinde duracak kadar
          güçlenmişsin demektir, daha ne istiyorsun?
        </p>
        <p>
          Bir de unutma evladım, Blessed kartın yalnızca tek bir oyuncuyu etkileyebilir. Herhangi
          bir etki yüzünden birden fazla oyuncuya etki edecek olursa kart ortadan kalkar.
        </p>
        <p>Ha, bir de Blessed kartları takas edemezsin! Kısmet dediğin elden ele dolaşmaz.</p>

        <Topic>Blessed Kartların Bedeli</Topic>
        <p>
          Blessed kartların Legend Point bedeli yoktur yavrum. Bunlar öyle parayla pulla ölçülmez! O
          yüzden kartların bedelleriyle etkileşime giren hiçbir kart veya etki, Blessed kartlara
          işlemez.
        </p>
      </RulesSection>

      <RulesSection title="True Word Kuralları">
        <p>
          Gel bakalım evladım, sana biraz eski bilgilerden bahsedeyim. True Word dediğin şey Legend
          kartlarına benzer ama sakın onları kart sanma! Onlar bildiğin kartlardan değildir kuzum,
          çok daha başka şeylerdir.
        </p>
        <p>
          Bu yüzden kartlarına etki eden hiçbir şey True Word'lerini etkilemez. Ayrıca kart sayısını
          hesaba katan etkilerde de True Word'ler sayılmaz.
        </p>

        <Topic>True Word Nasıl Kullanılır?</Topic>
        <p>
          Bak şimdi kuzum, bir True Word öğrendin mi artık senindir. Kullanınca desteye dönmezler.
          İstediğin kadar kullanırsın, yeter ki bedelini ödeyesin.
        </p>
        <p>Her True Word'ün ortasında yazan Legend Point bedelini ödeyerek onu kullanabilirsin.</p>
        <p>
          Amaaa... İşin bir inceliği var evladım! True Word'ünü savaşın{' '}
          <Highlight>ilk turunda, kendi sıranda</Highlight> kullanman gerekir. Kullanırsan etkisi
          savaşın sonuna kadar sürer.
        </p>
        <p>
          İlk turunda kullanmadın mı? Geçmiş olsun kuzum! O savaşta artık kullanamazsın. Demir
          tavında dövülür, söz de vaktinde söylenir!
        </p>

        <Topic>True Word Nasıl Öğrenilir?</Topic>
        <p>
          Evladım, True Word öğrenmek öyle kitap açıp iki satır okumaya benzemez. Önce bir draft
          yapacaksın.
        </p>
        <p>
          Öğrenmeye karar verdiğinde önüne rastgele üç True Word çıkar. Bunlardan birini seçip
          öğrenebilirsin. Hiçbiri gönlüne yatmazsa üçünü de es geçebilirsin. Zorla güzellik olmaz
          kuzum!
        </p>
        <p>
          Ama tabii bunun da bir bedeli var. True Word draft etmenin bedeli{' '}
          <Highlight>1 Legend Point + hâlihazırda bildiğin True Word sayısıdır.</Highlight>
        </p>
        <p>
          Yani ne kadar çok bilirsen yenisini öğrenmek o kadar pahalıya gelir. Bilginin de yükü var
          evladım, boşuna dememişler!
        </p>

        <Topic>True Word Sahipliği</Topic>
        <p>
          Şimdi kuzum, iki farklı oyuncu aynı True Word'ü öğrenebilir. Bilgi paylaştıkça çoğalır,
          hemi? Ama bir True Word'ü öğrendin mi artık unutamazsın! Öyle vazgeçtim, aklımdan sildim
          demek yok. Bir kere zihnine kazındı mı ömür boyu seninle! Ha, bir de True Word'ler takas
          edilemez evladım.
        </p>
      </RulesSection>
    </div>
  )
}
