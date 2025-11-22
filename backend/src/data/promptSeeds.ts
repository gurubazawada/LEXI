export type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'jp' | 'pt' | 'it' | 'zh';

export const supportedLanguages: LanguageCode[] = ['en', 'es', 'de', 'fr', 'jp', 'pt', 'it', 'zh'];

type TemplateBuilder = (topic: string) => string;

const promptTopics: Record<LanguageCode, string[]> = {
  en: ['travel', 'food', 'work', 'music', 'movies', 'books', 'hobbies', 'family', 'technology', 'nature'],
  es: ['viajes', 'comida', 'trabajo', 'musica', 'peliculas', 'libros', 'pasatiempos', 'familia', 'tecnologia', 'naturaleza'],
  de: ['Reisen', 'Essen', 'Arbeit', 'Musik', 'Filme', 'Buecher', 'Hobbys', 'Familie', 'Technologie', 'Natur'],
  fr: ['voyages', 'cuisine', 'travail', 'musique', 'films', 'livres', 'loisirs', 'famille', 'technologie', 'nature'],
  jp: ['旅行', '食べ物', '仕事', '音楽', '映画', '本', '趣味', '家族', 'テクノロジー', '自然'],
  pt: ['viagens', 'comida', 'trabalho', 'musica', 'filmes', 'livros', 'hobbies', 'familia', 'tecnologia', 'natureza'],
  it: ['viaggi', 'cibo', 'lavoro', 'musica', 'film', 'libri', 'hobby', 'famiglia', 'tecnologia', 'natura'],
  zh: ['旅行', '美食', '工作', '音乐', '电影', '书籍', '爱好', '家庭', '科技', '自然'],
};

const promptTemplates: Record<LanguageCode, TemplateBuilder[]> = {
  en: [
    (topic) => `What's something new you learned about ${topic} recently?`,
    (topic) => `What do you enjoy most about ${topic}?`,
    (topic) => `How does ${topic} show up in your daily routine?`,
    (topic) => `Tell me a story about ${topic} from your life.`,
    (topic) => `What questions do you still have about ${topic}?`,
    (topic) => `Why is ${topic} important to you?`,
    (topic) => `What would you change about how people think of ${topic}?`,
    (topic) => `Who influenced how you see ${topic}?`,
    (topic) => `What beginner tips would you give someone about ${topic}?`,
    (topic) => `What's a challenge you have faced with ${topic}?`,
  ],
  es: [
    (topic) => `Que aprendiste recientemente sobre ${topic}?`,
    (topic) => `Que disfrutas mas de ${topic}?`,
    (topic) => `Como aparece ${topic} en tu rutina diaria?`,
    (topic) => `Cuentame una historia de tu vida relacionada con ${topic}.`,
    (topic) => `Que dudas aun tienes sobre ${topic}?`,
    (topic) => `Por que es importante para ti ${topic}?`,
    (topic) => `Que cambiarias sobre la manera en que la gente piensa en ${topic}?`,
    (topic) => `Quien influyo en como ves ${topic}?`,
    (topic) => `Que consejo basico darias a alguien sobre ${topic}?`,
    (topic) => `Que desafio has enfrentado con ${topic}?`,
  ],
  de: [
    (topic) => `Was hast du kuerzlich ueber ${topic} gelernt?`,
    (topic) => `Was gefaellt dir am meisten an ${topic}?`,
    (topic) => `Wie taucht ${topic} in deinem Alltag auf?`,
    (topic) => `Erzaehl mir eine Geschichte aus deinem Leben ueber ${topic}.`,
    (topic) => `Welche Fragen hast du noch zu ${topic}?`,
    (topic) => `Warum ist ${topic} dir wichtig?`,
    (topic) => `Was wuerdest du aendern, wie Menschen ueber ${topic} denken?`,
    (topic) => `Wer hat beeinflusst, wie du ${topic} siehst?`,
    (topic) => `Welche Tipps fuer Anfaenger wuerdest du zu ${topic} geben?`,
    (topic) => `Welche Herausforderung hast du mit ${topic} erlebt?`,
  ],
  fr: [
    (topic) => `Qu as tu appris recemment sur ${topic}?`,
    (topic) => `Qu est ce que tu apprecies le plus dans ${topic}?`,
    (topic) => `Comment ${topic} apparait dans ta routine quotidienne?`,
    (topic) => `Raconte moi une histoire de ta vie a propos de ${topic}.`,
    (topic) => `Quelles questions as tu encore sur ${topic}?`,
    (topic) => `Pourquoi ${topic} est important pour toi?`,
    (topic) => `Que changerais tu dans la facon dont les gens pensent a ${topic}?`,
    (topic) => `Qui a influence ta facon de voir ${topic}?`,
    (topic) => `Quels conseils de base donnerais tu a quelqu un sur ${topic}?`,
    (topic) => `Quelle difficulte as tu deja rencontree avec ${topic}?`,
  ],
  jp: [
    (topic) => `${topic}について最近知ったことは何ですか？`,
    (topic) => `${topic}のどんなところが一番好きですか？`,
    (topic) => `${topic}はあなたの日常にどう関わっていますか？`,
    (topic) => `${topic}にまつわるあなたの体験を教えてください。`,
    (topic) => `${topic}についてまだ知りたいことは何ですか？`,
    (topic) => `なぜ${topic}があなたにとって大事ですか？`,
    (topic) => `${topic}について人々の考えで変えたい点はありますか？`,
    (topic) => `${topic}の見方に影響を与えた人は誰ですか？`,
    (topic) => `${topic}を始める人にどんなアドバイスをしますか？`,
    (topic) => `${topic}で直面した課題は何でしたか？`,
  ],
  pt: [
    (topic) => `O que voce aprendeu recentemente sobre ${topic}?`,
    (topic) => `O que voce mais gosta em ${topic}?`,
    (topic) => `Como ${topic} aparece na sua rotina diaria?`,
    (topic) => `Conte uma historia da sua vida ligada a ${topic}.`,
    (topic) => `Que duvidas voce ainda tem sobre ${topic}?`,
    (topic) => `Por que ${topic} e importante para voce?`,
    (topic) => `O que mudaria na maneira como as pessoas pensam em ${topic}?`,
    (topic) => `Quem influenciou sua visao sobre ${topic}?`,
    (topic) => `Que dicas basicas voce daria para alguem sobre ${topic}?`,
    (topic) => `Que desafio voce ja enfrentou com ${topic}?`,
  ],
  it: [
    (topic) => `Che cosa hai imparato di recente su ${topic}?`,
    (topic) => `Cosa ti piace di piu di ${topic}?`,
    (topic) => `Come entra ${topic} nella tua routine quotidiana?`,
    (topic) => `Raccontami una storia della tua vita su ${topic}.`,
    (topic) => `Quali domande hai ancora su ${topic}?`,
    (topic) => `Perche ${topic} e importante per te?`,
    (topic) => `Cosa cambieresti nel modo in cui le persone pensano a ${topic}?`,
    (topic) => `Chi ha influenzato il tuo modo di vedere ${topic}?`,
    (topic) => `Quali consigli base daresti a qualcuno su ${topic}?`,
    (topic) => `Quale sfida hai affrontato con ${topic}?`,
  ],
  zh: [
    (topic) => `最近你在${topic}方面学到什么新东西？`,
    (topic) => `你最喜欢${topic}的哪一点？`,
    (topic) => `${topic}在你的日常生活中是怎样出现的？`,
    (topic) => `说说你和${topic}有关的一个经历。`,
    (topic) => `关于${topic}你还有哪些疑问？`,
    (topic) => `为什么${topic}对你很重要？`,
    (topic) => `你希望人们改变对${topic}的哪种看法？`,
    (topic) => `谁影响了你看待${topic}的方式？`,
    (topic) => `如果有人想尝试${topic}，你会给什么入门建议？`,
    (topic) => `你在${topic}方面遇到过什么挑战？`,
  ],
};

const PROMPTS_PER_LANGUAGE = 100;

function buildPrompts(language: LanguageCode): string[] {
  const topics = promptTopics[language];
  const templates = promptTemplates[language];
  const prompts: string[] = [];

  for (const topic of topics) {
    for (const template of templates) {
      prompts.push(template(topic));
    }
  }

  return prompts.slice(0, PROMPTS_PER_LANGUAGE);
}

export const promptSeeds: Record<LanguageCode, string[]> = Object.fromEntries(
  supportedLanguages.map((language) => [language, buildPrompts(language)])
) as Record<LanguageCode, string[]>;

for (const language of supportedLanguages) {
  const promptCount = promptSeeds[language]?.length ?? 0;
  if (promptCount < PROMPTS_PER_LANGUAGE) {
    throw new Error(`Expected ${PROMPTS_PER_LANGUAGE} prompts for ${language} but found ${promptCount}`);
  }
}
