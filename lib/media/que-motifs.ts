// lib/media/que-motifs.ts
// ============================================================
// SÁU sự việc mỗi quẻ, theo thứ tự hào 1 → hào 6, viết bằng tiếng Anh để đưa
// thẳng vào prompt vẽ. Đây là phần DỊCH HÌNH của 384 hào từ trong
// `public/tools-shared/kinh-dich-hao.js`.
//
// 🔑 VÌ SAO LÀ FILE DỮ LIỆU CHỨ KHÔNG SINH BẰNG LLM LÚC CHẠY:
// bộ 64 bức vẽ MỘT LẦN rồi dùng mãi. Nhờ model diễn hào từ ra cảnh mỗi lượt thì
// (a) tốn thêm một lượt LLM cho mỗi bức, (b) hai lần dựng lại bộ tranh ra hai
// bộ cảnh khác nhau, (c) không ai soát được cảnh trước khi đốt tiền vẽ. Viết
// tay thì soát được bằng mắt, và bức tranh khớp ĐÚNG câu chữ mà tool hiện ra
// cho người gieo đọc — đó chính là điều kiện để "quẻ bằng hình" có nghĩa.
//
// ⚠️ GIỮ NGUYÊN TÍNH NGUYÊN BẢN CỦA HÀO. Cổ văn có chỗ dữ dằn — xe chở xác về
// (Sư hào 3), máu chảy đen vàng (Khôn hào 6), xẻo mũi chặt chân (Khốn hào 5).
// KHÔNG được làm nhẹ đi cho dễ coi: bức tranh phải khớp với lời đoán hiện bên
// cạnh nó, nếu không thì người gieo đọc một đằng nhìn một nẻo. Đã thử — không
// lượt nào bị bộ lọc nội dung của OpenAI từ chối.
//
// LUẬT VIẾT MỘT DÒNG MÔ-TÍP:
//   · một sự việc NHÌN THẤY ĐƯỢC, không phải một lời bình ("tốt", "giữ chính")
//   · người/vật cụ thể, cỡ nhỏ trong phong cảnh — tranh trục treo, không phải
//     chân dung; sáu dải chiều cao đã dựng sẵn ở `que-image-prompt.ts`
//   · ~10–25 chữ; dài hơn thì model bắt đầu bỏ bớt dải khác
//   · KHÔNG nhắc chữ viết, con dấu, khung tranh — ba thứ đó prompt lo riêng
// ============================================================

/** kingWen (1–64) → sáu mô-típ, phần tử 0 = hào 1 (dưới cùng). */
export const QUE_MOTIFS: Record<number, string[]> = {
  // 1 · Càn 乾為天
  1: [
    'a dragon submerged in a deep pool, only its coiled shape visible beneath the dark water',
    'a dragon standing in an open field, a scholar approaching it across the grass',
    'a man at a desk working by lamplight late into the night, alert and unresting',
    'a dragon poised at the lip of a chasm, half-risen, neither leaping nor retreating',
    'a dragon flying in open sky above the clouds, an official bowing far below',
    'a dragon climbed too high into thin empty air, alone and beginning to falter',
  ],
  // 2 · Khôn 坤為地
  2: [
    'a traveller pausing to look at hoarfrost on the ground at dawn, breath visible',
    'a wide level field newly ploughed in straight furrows to the horizon',
    'a scholar quietly closing a lacquer box of writings without showing them',
    'a servant drawing the mouth of a large sack tightly shut and knotting the cord',
    'a noblewoman in a yellow lower garment seated calmly among attendants',
    'two dragons locked in combat on open ground, dark and yellow blood on the earth',
  ],
  // 3 · Truân 水雷屯
  3: [
    'a cart halted at the head of an untravelled road while men drive in a boundary post',
    'a bridal party stalled, horses turned aside, a young woman standing apart, refusing',
    'a hunter chasing a deer alone into thick forest with no guide, losing the trail',
    'the same horses turned back toward the house, now carrying betrothal gifts',
    'rain clouds held above a parched field, releasing only a few drops',
    'a rider slumped on a halted horse, weeping, blood at the corners of his eyes',
  ],
  // 4 · Mông 山水蒙
  4: [
    'a boy in wooden stocks being released by a teacher who has just struck the ground with a rod',
    'a teacher seated among unruly children, tolerating them; a wedding party passing behind',
    'a young woman turning away from a suitor toward a man holding a string of coins',
    'a boy lost in a dim ravine, hands out, no one on the path above him',
    'a boy kneeling before a teacher with both hands raised, asking to be taught',
    'a guard striking down a thief at a village gate while the villagers stand unharmed',
  ],
  // 5 · Nhu 水天需
  5: [
    'travellers camped far out on open grassland, the river gorge still distant',
    'the same travellers resting on a sandbank, two of them arguing quietly',
    'a man standing to his ankles in river mud as armed figures appear on the bank',
    'a wounded man being pulled up out of a cave mouth by his companions',
    'a host and guests seated at a low table with wine and roast meat, unhurried',
    'three unannounced travellers arriving at a cave dwelling, the host bowing to them',
  ],
  // 6 · Tụng 天水訟
  6: [
    'a man turning away from a magistrate’s gate, letting a dispute drop',
    'a defeated litigant riding home to a very small walled hamlet of a few hundred roofs',
    'a man eating a plain meal on his ancestral land while soldiers pass on the road',
    'a man returning from court to his own fields and taking up a hoe',
    'a magistrate in court robes giving judgement from a raised seat, scales beside him',
    'a courtier receiving a ceremonial sash, and the same sash being stripped from him',
  ],
  // 7 · Sư 地水師
  7: [
    'troops forming ranks at a camp gate under a standard, an officer checking the line',
    'a commander at the centre of the camp receiving a royal envoy with a decree',
    'a cart carrying corpses back from the field, escorted by silent soldiers',
    'an army withdrawing in good order to a rear encampment among low hills',
    'a great beast driven from the fields as the veteran general gives the order',
    'a king investing a meritorious officer with a fief, another man turned away',
  ],
  // 8 · Tỉ 水地比
  8: [
    'a man offering a full earthenware jar of water to strangers at a village well',
    'kinsmen greeting one another inside the courtyard of a house',
    'a man clasping hands with a shifty stranger while others look away',
    'a retainer stepping outside the gate to attach himself to a passing lord',
    'a royal hunt enclosing three sides of a field, the game escaping freely to the front',
    'a crowd gathered on a hillside with no leader, milling and scattering',
  ],
  // 9 · Tiểu Súc 風天小畜
  9: [
    'a traveller turning back onto his own proper road at a fork',
    'two companions walking back together along that same road',
    'a cart with its wheel spokes sprung, a husband and wife turned from each other beside it',
    'a household making a sincere offering as a storm passes over without harm',
    'a wealthy man leading his neighbours up a rising path, all linked together',
    'a nearly full moon over wet ground after rain, a soldier hesitating at the gate',
  ],
  // 10 · Lý 天澤履
  10: [
    'a barefoot man in plain undyed clothing walking steadily on a country road',
    'a hermit walking a broad level path alone through quiet country',
    'a one-eyed, lame man stepping on a tiger’s tail and being seized by it',
    'a man treading close behind a tiger, watching its tail with extreme care',
    'a man forcing his way forward over rough ground, driving others aside',
    'an old man at a high turn in the road, looking back down the whole way he has come',
  ],
  // 11 · Thái 地天泰
  11: [
    'a man pulling up couch grass and lifting a whole tangled root mass with it',
    'a man wading a river carrying a load, leaving no one behind on the far bank',
    'a level embankment beginning to tilt, a traveller setting out on the return road',
    'a noble descending lightly from his carriage to stand among unlanded neighbours',
    'a royal bride in a marriage procession being given to a lesser house',
    'a section of city wall collapsing into its own moat, weapons laid aside',
  ],
  // 12 · Bĩ 天地否
  12: [
    'men pulling up couch grass with its whole root mass and withdrawing together',
    'a small-minded man prospering at a gate while a scholar waits outside it',
    'men carrying a load they are ashamed to be seen with, heads lowered',
    'an envoy delivering a decree to a waiting group who share in the relief',
    'a man binding a post to the trunk of a mulberry tree with many turns of cord',
    'a barrier across a road being overturned, travellers laughing beyond it',
  ],
  // 13 · Đồng Nhân 天火同人
  13: [
    'strangers meeting and greeting one another just outside a gate, no one excluded',
    'a family gathering behind a closed clan gate, keeping to their own',
    'armed men hidden in thick undergrowth while one climbs a mound to watch',
    'a man on top of a neighbour’s wall lowering his weapon and climbing back down',
    'two companions weeping and then laughing as troops break through to reach them',
    'a small group meeting on empty ground far outside the town',
  ],
  // 14 · Đại Hữu 火天大有
  14: [
    'a merchant checking his stores carefully before setting out, touching nothing harmful',
    'a great wagon heavily loaded and moving well along a road',
    'a feudal lord presenting tribute to the Son of Heaven at a hall’s steps',
    'a wealthy man travelling with no banners and no escort of note',
    'two men exchanging a pledge, one bowing, the other standing with quiet authority',
    'a household making an offering as light breaks over the roof, everything favourable',
  ],
  // 15 · Khiêm 地山謙
  15: [
    'a modest man bowing lower than required, then boarding a boat to cross a great river',
    'people speaking well of a man who keeps his eyes lowered among them',
    'a man with visible merit still carrying his own load at the end of a long day',
    'a man distributing grain outward to many hands from a low platform',
    'a man who is plainly rich walking with his neighbours, leading them against raiders',
    'troops mustering not to invade but to put the men of their own town in order',
  ],
  // 16 · Dự 雷地豫
  16: [
    'a man loudly boasting of his good fortune to indifferent passers-by',
    'a man firm as stone rising to act before the day is out',
    'a man gazing upward at a lord’s pleasure-terrace, hesitating on the steps',
    'a man at the centre of a joyful gathering as friends converge on him like hairpins',
    'a bedridden man, long ill and long unhealed, tended in a quiet room',
    'a man sunk deep in feasting who is beginning to push the cup away',
  ],
  // 17 · Tùy 澤雷隨
  17: [
    'a steward handing his badge of office to another man, then walking out of the gate to meet strangers',
    'a man following a small child down a side path while an elder walks away unattended',
    'the same man turning back to follow the elder, the child left behind',
    'a follower quietly filling his own sleeve from his lord’s stores',
    'two men exchanging a plain pledge over a good and honest thing',
    'a bound offering being carried up a western mountain for a royal sacrifice',
  ],
  // 18 · Cổ 山風蠱
  18: [
    'a son repairing the collapsed wall of his father’s house, working carefully',
    'a son gently persuading his mother, not pressing her, in a quiet inner room',
    'a son rebuilding his father’s work in haste, mortar spilling, but the wall standing',
    'a son leaving his father’s ruined granary untouched and walking on down the road',
    'a finished repair being praised by neighbours gathered at the gate',
    'a hermit on a high slope turning his back on a lord’s messenger below',
  ],
  // 19 · Lâm 地澤臨
  19: [
    'an official coming down to a village and being met with real feeling at the gate',
    'the same official walking among the fields with the farmers, entirely at ease',
    'a man flattering a village elder with honeyed words, no one convinced',
    'an inspector arriving at the very edge of the fields to look at the crop himself',
    'a ruler on a low terrace listening to reports from clear-eyed advisers',
    'a generous old official distributing grain with his own hands',
  ],
  // 20 · Quán 風地觀
  20: [
    'a child looking at a great ceremony from far off, understanding nothing of it',
    'a woman watching a procession through the crack of a door',
    'a man standing still on a road, weighing whether to go on or turn back',
    'a traveller admiring the splendour of a foreign capital, received as a guest of its ruler',
    'a scholar examining his own conduct alone in a quiet room',
    'a teacher watching the lives of those he has taught, from a rise above their village',
  ],
  // 21 · Phệ Hạp 火雷噬嗑
  21: [
    'a first offender in light wooden foot-stocks, his toes hidden, the punishment small',
    'a man biting into tender meat so deeply that his nose is buried in it',
    'a man biting dried meat and recoiling from a tainted, spoiled piece',
    'a man biting dried meat on the bone and drawing out a bronze arrowhead',
    'a man biting dried meat and finding pure gold in it',
    'a prisoner in a heavy cangue that covers his ears, hearing nothing',
  ],
  // 22 · Bí 山火賁
  22: [
    'a man stepping down from a carriage to walk on foot in plain sandals',
    'a man having his beard dressed and oiled by a servant',
    'a scholar in richly glossed robes standing steadily by a stream',
    'a white horse galloping up, its rider bearing betrothal gifts, not weapons',
    'a modest garden terrace where a marriage is sealed with one thin roll of silk',
    'a man in plain undyed white, all ornament put aside',
  ],
  // 23 · Bác 山地剝
  23: [
    'the legs of a wooden bed being gnawed away from beneath, the frame tilting',
    'the same bed eaten through at its frame, one side sagging to the floor',
    'a man standing clear of the ruined bed, apart from those pulling it down',
    'the bed’s surface broken through to where a sleeper lies',
    'palace women being led in orderly file like fish strung on a line',
    'one large fruit left uneaten on a bare tree; a man given a carriage, a hut collapsing',
  ],
  // 24 · Phục 地雷復
  24: [
    'a traveller turning back after only a short distance from his gate',
    'a man returning home in good spirits alongside a companion',
    'a man on a road repeatedly turning back, going on, and turning back again',
    'a man leaving a moving crowd to return alone along the proper road',
    'an older man returning home steadily and settling at his own hearth',
    'an army utterly routed in a valley, its ruler struck down, the banners fallen',
  ],
  // 25 · Vô Vọng 天雷無妄
  25: [
    'a man setting out on an honest errand at first light',
    'a man standing before an unploughed field expecting a harvest from it',
    'a tethered ox being led off by a passing traveller while villagers are blamed',
    'a man holding to his own ground while trouble passes on the road',
    'a sick man recovering on his own, an untouched medicine bowl beside him',
    'a man setting out despite everything and meeting disaster on the road',
  ],
  // 26 · Đại Súc 山天大畜
  26: [
    'a traveller halting at the head of a dangerous defile and going no further',
    'a cart with its axle-straps removed, deliberately taken out of service',
    'fine horses running in file along a road while men drill with carts and armour',
    'a young calf being fitted with a headboard before its horns have grown',
    'a gelded boar in a pen, its tusks no longer dangerous',
    'a broad open road running up into the sky over a mountain pass',
  ],
  // 27 · Di 山雷頤
  27: [
    'a man setting aside his own sacred tortoise to watch another man eat, mouth open',
    'a man of standing begging food from those below him',
    'a man refusing proper food, wasting at a laden table',
    'a man seeking nourishment from below with a fixed tiger-like stare',
    'a ruler settled at home, fed by others, a great river left uncrossed',
    'a provider feeding a whole countryside, then boarding a boat to cross the river',
  ],
  // 28 · Đại Quá 澤風大過
  28: [
    'an offering set down on a thick mat of white couch grass, over-carefully',
    'a withered poplar putting out fresh shoots; an old man beside a young bride',
    'a roof ridgepole bending downward under too much weight',
    'a ridgepole propped and arching upward again, a distraction at the door',
    'a withered poplar in flower; an old woman beside a young husband',
    'a man fording deep water that closes over his head, still moving forward',
  ],
  // 29 · Khảm 坎為水
  29: [
    'a man fallen into a pit that opens into a deeper pit beneath it',
    'a man in a flooded hollow reaching only for what is close at hand',
    'a traveller boxed in by water on every side, pits layered before and behind',
    'a jar of wine and two bowls of rice passed in through a small window',
    'a flood pit nearly level with the ground again, the worst water gone',
    'a man bound with black cords and set among thorn bushes',
  ],
  // 30 · Ly 離為火
  30: [
    'a man’s first steps of the day confused and crossing, then steadied',
    'a lamp burning with a clear yellow flame at the centre of a room',
    'the sun low and red at evening; an old man with an undrummed jar, sighing',
    'a fire arriving suddenly, blazing up, burning out, its ashes cast away',
    'a man weeping like rain in grief and fear at a doorway',
    'a king’s army returning with the chief rebel taken, his followers unharmed',
  ],
  // 31 · Hàm 澤山咸
  31: [
    'a stirring felt in the big toe of a man about to rise',
    'a man whose calves are already moving, held back by a companion',
    'a man following others by the thigh, carried along by the crowd',
    'a man pacing back and forth, undecided, a few like-minded friends waiting',
    'a man feeling something in his back, out of his own sight',
    'a man moving only his jaws and tongue, talking and nothing more',
  ],
  // 32 · Hằng 雷風恆
  32: [
    'a man digging far too deep a foundation on the very first day',
    'a man at a steady task, an old regret visibly set down',
    'a man abandoning his post partway and being shamed before others',
    'a hunter returning from the field with nothing at all',
    'a widow keeping to one path; a man beside her held back by the same rigidity',
    'a man in constant agitation, unable to hold to anything',
  ],
  // 33 · Độn 天山遯
  33: [
    'the last man in a retreating column, caught at the tail of it',
    'a bundle tied fast with yellow oxhide that no one can loosen',
    'a man trying to withdraw while dependants cling to him, ill and hemmed in',
    'a man withdrawing gracefully over a ridge, unhurried',
    'a man leaving at exactly the right moment, his affairs in order',
    'a man riding away into open country with room and time to spare',
  ],
  // 34 · Đại Tráng 雷天大壯
  34: [
    'a man at the very bottom of a slope pushing forward on his toes alone',
    'a strong man holding his ground without advancing',
    'a ram driving its horns into a fence and sticking fast in it',
    'the same fence opened, the ram free, a great cart axle sound and strong',
    'a shepherd on the borderland who has lost his ram and is untroubled',
    'a ram wedged in a fence, able neither to go back nor forward',
  ],
  // 35 · Tấn 火地晉
  35: [
    'a candidate turned back at a gate, waiting calmly outside it',
    'an anxious man advancing with lowered head, a gift of grain waiting ahead of him',
    'a man carried forward by a crowd of supporters pressing behind him',
    'a field rat creeping up a granary wall, greedy and weak',
    'a man walking on without glancing at what he gains or loses',
    'a man reaching the end of his advance and turning his force on his own town',
  ],
  // 36 · Minh Di 地火明夷
  36: [
    'a bright bird struck in flight, wings drooping; a traveller three days unfed',
    'a man wounded in the left thigh being carried out on a strong horse',
    'a southern hunt in which the chief quarry is taken, the rest left alone',
    'a man emerging from an inner gate having learned what is hidden within',
    'a nobleman feigning madness in a dim hall to survive it',
    'the sun gone entirely dark, a figure fallen from the sky to the ground',
  ],
  // 37 · Gia Nhân 風火家人
  37: [
    'a household setting out its rules at the gate on the first day',
    'a woman at the kitchen hearth attending to the family’s food',
    'a stern father with a complaining household; children laughing loosely nearby',
    'a prosperous household courtyard with full granaries and quiet order',
    'a ruler visiting a family in person, entirely at ease among them',
    'a head of house who is both trusted and feared, standing at the door',
  ],
  // 38 · Khuê 火澤睽
  38: [
    'a lost horse returning by itself; a disliked man being received at the door anyway',
    'two men meeting unexpectedly in a narrow back lane',
    'a cart dragged backward, an ox held fast, its driver branded and bound',
    'a man standing alone in opposition, met by one great friend who trusts him',
    'kinsmen sharing tender meat together at a table',
    'a mud-covered pig and a cart full of demons; a bow drawn, then lowered, then rain',
  ],
  // 39 · Kiển 水山蹇
  39: [
    'a traveller stopped by a landslide and turning back to praise at home',
    'a royal servant struggling through a flooded pass on the king’s business',
    'a man halted at broken ground, turning to retrace his steps',
    'a man turning back and finding companions waiting to go with him',
    'a man in the worst of the difficulty as friends arrive from every side',
    'a man who has turned back and now stands with an elder of great standing',
  ],
  // 40 · Giải 雷水解
  40: [
    'a knot on a rope being loosened easily by one hand',
    'a hunter with three foxes taken and a bronze arrowhead in his palm',
    'a porter with a heavy pack riding in a carriage, robbers watching the road',
    'a man shaking a clinging figure off his foot as friends come up the path',
    'a man untying his own bonds while onlookers watch, convinced',
    'a lord on a high wall shooting a hawk and hitting it',
  ],
  // 41 · Tổn 山澤損
  41: [
    'a man finishing his own work and going straight on to help a neighbour',
    'a man holding back from advancing, adding to another’s store instead of his own',
    'three men on a road, one turning aside; a lone man joined by a companion',
    'a sick man visibly mending after quick treatment',
    'a great tortoise shell presented as a gift too valuable to refuse',
    'a man gaining followers from everywhere without a household of his own',
  ],
  // 42 · Ích 風雷益
  42: [
    'a great undertaking begun, timber and stone brought to a site',
    'a valuable tortoise shell offered, and a king making sacrifice to heaven',
    'help arriving during a disaster; a man reporting upward holding a jade tablet',
    'a minister on the middle road being heeded; a capital city being moved',
    'a man giving freely and being thanked without having asked for thanks',
    'a man struck by those he expected to help him, his resolve unsettled',
  ],
  // 43 · Quải 澤天夬
  43: [
    'a man pushing forward on his toes into a fight he cannot win',
    'a watchman calling the alarm at night, armed men in the dark held off',
    'strength showing in a man’s cheekbones; the same man alone in the rain, mud-spattered',
    'a man limping with a flayed seat, a sheep on a lead behind him, refusing advice',
    'purslane being pulled up cleanly by the roots along a middle path',
    'a wall with no watchman left on it, the alarm unsounded',
  ],
  // 44 · Cấu 天風姤
  44: [
    'a cart wheel checked by a metal brake; a lean pig thrashing against its tether',
    'a fish inside a wrapped bundle, kept back from the guests',
    'a man limping with a flayed seat, going on despite it',
    'an empty wrapping opened to show no fish at all',
    'a melon wrapped in medlar leaves; something falling from the sky above it',
    'two men meeting at the very horn-tip of a ridge, at the far end of everything',
  ],
  // 45 · Tụy 澤地萃
  45: [
    'a crowd scattering and re-forming; one shout, and it becomes a celebration',
    'people drawn together behind a leader, a small plain offering set out',
    'a man sighing alone, unable to join the gathering, then going anyway',
    'a great assembly in good order on level ground',
    'a ruler at the centre of the assembly holding the proper place',
    'a man weeping openly, face wet, repenting before the others',
  ],
  // 46 · Thăng 地風升
  46: [
    'a man raised up by those who trust him, lifted on their shoulders',
    'a small sincere offering accepted at a shrine',
    'a man walking up into an empty town, no one barring the way',
    'a royal sacrifice being made on Mount Qi',
    'a man climbing a stone stair one step at a time',
    'a man still climbing in darkness, unable to stop, the steps unseen',
  ],
  // 47 · Khốn 澤水困
  47: [
    'a man wedged on a dead stump, lost in a deep gully, no face seen for years',
    'a man hemmed in among wine and meat as a red official sash is delivered to him',
    'a man blocked by a boulder, hands in thorn bushes, returning to an empty house',
    'a bronze carriage blocking a road, a man arriving slowly behind it',
    'a mutilated man, nose cut and feet cut off, tangled in a red official sash',
    'a man wrapped in creeper vines on unstable footing, starting to move anyway',
  ],
  // 48 · Tỉnh 水風井
  48: [
    'a well choked with mud that no one drinks from; birds avoid the ruined shaft',
    'well water leaking away down a crack, only minnows in the trickle; a cracked jar',
    'a clean dredged well with no one drawing from it, a man watching in dismay',
    'masons lining a well with fresh stone',
    'clear cold water being drawn up and drunk',
    'a finished well left uncovered, everyone free to draw from it',
  ],
  // 49 · Cách 澤火革
  49: [
    'a bundle bound tight in yellow oxhide, not yet to be opened',
    'a change begun on the appointed day, an old marker taken down',
    'men deliberating a change for the third time before agreeing',
    'a decree being changed, sincerely, and accepted',
    'a great man transformed like a tiger in new pelt, no divination needed',
    'a leopard’s new spots; beside it a man who has changed only his face',
  ],
  // 50 · Đỉnh 火風鼎
  50: [
    'a bronze cauldron tipped on its side to empty out old sediment; a concubine with a son',
    'a full cauldron; a rival kept at a distance by illness',
    'a cauldron with broken carrying-ears, uncarryable; rich pheasant left untouched, then rain',
    'a cauldron with a snapped leg spilling a lord’s food, a man splashed and shamed',
    'a cauldron with yellow ears and a bronze carrying-bar',
    'a cauldron with a jade carrying-bar, lifted with ease',
  ],
  // 51 · Chấn 震為雷
  51: [
    'a man startled flat by a thunderclap, then laughing with his companions',
    'a man scrambling up nine terraced mounds, his goods abandoned below',
    'a man walking on unsettled through the storm, moving with the thunder',
    'a thunderbolt sunk into soft mud, its force stuck there',
    'a man standing amid repeated thunder, having lost nothing, work still in hand',
    'a man with darting frightened eyes as lightning strikes a neighbour’s roof',
  ],
  // 52 · Cấn 艮為山
  52: [
    'a man halting with his toes at the very edge of a step',
    'a man stopped at the calves, unable to help the figure walking on ahead of him',
    'a man rigid at the waist, the muscles of his back visibly strained',
    'a man standing completely still, his whole body at rest',
    'a man with his mouth closed, speaking only in order',
    'an old man settled immovably on a mountain, wholly at rest',
  ],
  // 53 · Tiệm 風山漸
  53: [
    'a wild goose reaching the water’s edge, a young one exposed and unsteady',
    'a wild goose standing on a great flat boulder, feeding at leisure',
    'a goose on a dry mound; a wife alone, a husband gone, armed men on the border',
    'a goose settling in a tree and finding one flat branch to hold',
    'a goose on a high hill; a wife after three childless years, unhindered at last',
    'geese rising onto the cloud road, their feathers used for ritual ornament',
  ],
  // 54 · Quy Muội 雷澤歸妹
  54: [
    'a younger sister sent as a secondary wife; a lame man still walking',
    'a one-eyed man who can still see, living quietly apart',
    'a bride kept waiting, then returning as a lesser wife',
    'a marriage past its appointed season, the party setting out late',
    'a royal bride whose sleeves are plainer than her younger sister’s, under a nearly full moon',
    'a woman holding an empty basket; a man cutting a sheep that does not bleed',
  ],
  // 55 · Phong 雷火豐
  55: [
    'two equals meeting on a road and travelling together ten days',
    'a screen so heavy that the Dipper is visible at noon; a man opening it in good faith',
    'a curtain drawn wholly shut, faint stars at midday; a man with a broken right arm',
    'the same heavy screen at noon, an equal arriving to stand beside him',
    'a ruler welcoming men of ability into his hall',
    'a huge shuttered house, its doorway empty, no one seen for years',
  ],
  // 56 · Lữ 火山旅
  56: [
    'a traveller haggling meanly at a roadside and bringing trouble on himself',
    'a traveller at a good inn, his purse safe, a loyal servant beside him',
    'an inn burning down, the servant gone, the traveller in the road',
    'a traveller resting with money and an axe to hand, still unhappy',
    'a traveller shooting a pheasant, losing the arrow, and being given office',
    'a bird’s nest burning; a traveller laughing, then wailing; an ox lost on the border',
  ],
  // 57 · Tốn 巽為風
  57: [
    'a man advancing and retreating at a threshold, unable to decide',
    'a man crouched low under a bed while diviners bustle around him',
    'a man bowing, straightening, and bowing again, over and over',
    'a hunter returning with game of three different kinds',
    'a decree taking effect three days after its announcement, a rough start settling well',
    'a man under a bed who has lost both his money and his axe',
  ],
  // 58 · Đoài 兌為澤
  58: [
    'people enjoying themselves together in easy harmony',
    'a gathering whose pleasure rests on plain sincerity',
    'a man lowering himself to beg amusement from others',
    'a man weighing an invitation, then deliberately walking away from bad company',
    'a man confiding in someone who is quietly stripping his stores',
    'a man being pulled by both arms into a revel he did not choose',
  ],
  // 59 · Hoán 風水渙
  59: [
    'a rescue party riding out on strong horses the moment things scatter',
    'a man running back to the pillar of his own house as everything disperses',
    'a man giving up his own private share without regret',
    'a faction dispersed; the same people re-gathering into a great mound',
    'a ruler issuing a great decree, granaries opened, stores given away',
    'a household moving far off and escaping bloodshed entirely',
  ],
  // 60 · Tiết 水澤節
  60: [
    'a man staying inside his own courtyard, gate closed, at the right time',
    'a man still shut behind his outer gate long after he should have gone out',
    'an unrestrained man sighing over his own excess, then setting the cup down',
    'a household living within its means, unhurried and content',
    'a man keeping to limits that plainly suit him, at ease',
    'a man half-starved by his own harsh rule, beginning to relent',
  ],
  // 61 · Trung Phu 風澤中孚
  61: [
    'a man calculating carefully before acting, another beside him already distracted',
    'a crane calling in shade, its young answering; two men sharing a cup of wine',
    'a man facing a rival, by turns drumming, stopping, weeping and singing',
    'a nearly full moon; one horse of a matched pair gone, the driver looking upward',
    'two people holding fast to one another in complete trust',
    'a cockerel crowing toward the sky, its sound far larger than the bird',
  ],
  // 62 · Tiểu Quá 雷山小過
  62: [
    'a bird climbing far too high above the hills',
    'a traveller passing the grandfather and meeting the grandmother at the door',
    'a man walking unguarded while someone follows close behind him',
    'a man meeting another halfway on a road instead of pressing past him',
    'dense cloud from the west that has not yet rained; a lord shooting game in a cave',
    'a bird that would not stop flying, caught in a net',
  ],
  // 63 · Ký Tế 水火既濟
  63: [
    'a driver braking his wheels at a ford, an animal’s tail wet in the shallows',
    'a woman who has lost her carriage screen, not chasing after it',
    'a king’s long campaign against a distant country, ending after three years',
    'a boat with a leak already plugged with rags, watched all day',
    'an ox sacrificed at a lavish eastern altar; a small plain offering at a western one',
    'a man in the water up to his head at the very end of the crossing',
  ],
  // 64 · Vị Tế 火水未濟
  64: [
    'an animal that hurried into the ford and wet its tail',
    'a driver braking his wheels and going slowly and steadily',
    'a man setting out to cross before he is ready, the great river ahead',
    'an army returning from three years’ campaign and being rewarded by a great state',
    'a man of plain sincerity whose face is lit from within',
    'a man drinking with proper restraint; beside him another soaked to the head',
  ],
};
