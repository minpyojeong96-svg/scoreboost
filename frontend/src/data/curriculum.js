import { JG1 } from './curriculum_jg1.js'
import { JG2 } from './curriculum_jg2.js'
import { HG1 } from './curriculum_hg1.js'

export const CURRICULUM = {
  중1: JG1,
  중2: JG2,

  중3: {
    label: '중학교 3학년',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    topics: [
      {
        title: '현재완료 — 경험·완료',
        sentences: [
          'She has visited Paris three times so far.',
          'He has already finished reading the novel.',
          'Have you ever tried traditional Korean food?',
          'I have just arrived at the train station.',
          'She has never seen such a beautiful sunset.',
          'He has been to Japan twice this year.',
          'We have already eaten, so we are not hungry.',
          'Have they ever won a national competition?',
          'She has met the president once in her life.',
          'He has read that book many times already.',
        ]
      },
      {
        title: '현재완료 — 계속·결과 / vs 과거시제',
        sentences: [
          'She has lived in Seoul for ten years.',
          'He has studied English since he was young.',
          'We have known each other since elementary school.',
          'She has been sick since last Monday.',
          'He lost his wallet on the subway yesterday.',
          'Did you see that movie last weekend?',
          'She has lost her key and cannot get in.',
          'They finished the project two days ago.',
          'I have been waiting here for over an hour.',
          'She moved to this city three years ago.',
        ]
      },
      {
        title: '과거완료 (had + p.p.)',
        sentences: [
          'She had already left when I arrived.',
          'He had never seen snow before he visited Canada.',
          'By the time we got there, the show had started.',
          'She realized she had forgotten her wallet.',
          'He had been waiting for two hours when she came.',
          'They had finished dinner before we arrived.',
          'I had read the book before I saw the movie.',
          'She had never heard the song before that day.',
          'He had lost his phone, so he could not call.',
          'By noon, she had already completed the task.',
        ]
      },
      {
        title: '수동태 심화 (조동사·완료·진행)',
        sentences: [
          'The homework must be submitted by Friday.',
          'She was given a special award at the ceremony.',
          'The problem can be solved with effort.',
          'He was asked to give a speech at the event.',
          'The cake had been eaten before I arrived.',
          'The rules should be followed by all students.',
          'The building is being renovated right now.',
          'She will be promoted to the next level soon.',
          'The book has been translated into many languages.',
          'He was told to wait outside the office.',
        ]
      },
      {
        title: '관계대명사 심화 (what / 목적격 / 소유격)',
        sentences: [
          'What she said at the meeting surprised everyone.',
          'He gave her what she had always wanted.',
          'The teacher whom everyone loves is leaving.',
          'The book whose cover is red belongs to my friend.',
          'He is the scientist whose research changed medicine.',
          'That is the man whom she met at the conference.',
          'The house whose roof is blue is my uncle\'s.',
          'She is the girl whose smile makes everyone happy.',
          'What matters most is how hard you try.',
          'He showed me what he had made for the project.',
        ]
      },
      {
        title: '관계부사 (where / when / why / how)',
        sentences: [
          'This is the city where she was born.',
          'I remember the day when I first met my friend.',
          'That is the reason why she studied abroad.',
          'She showed me how she solved the problem.',
          'The hospital where he works is well known.',
          'There was a time when life was much simpler.',
          'I do not understand the reason why he quit.',
          'He explained how the new system would work.',
          'This is the place where they first met.',
          'That was the year when everything changed.',
        ]
      },
      {
        title: '간접의문문',
        sentences: [
          'I do not know where she went after school.',
          'Can you tell me what time the train leaves?',
          'Do you know if he will come to the party?',
          'She asked me why I was late for class.',
          'I wonder who wrote this beautiful poem.',
          'Please tell me how I can get to the museum.',
          'Do you know whether she passed the exam?',
          'He asked me where I had bought that bag.',
          'I am not sure what I should do now.',
          'She wanted to know when the results would come.',
        ]
      },
      {
        title: '분사구문 기본',
        sentences: [
          'Walking along the beach, she found an old bottle.',
          'Having finished his work, he went to the gym.',
          'Feeling tired, she decided to go to bed early.',
          'Not knowing the answer, he stayed silent.',
          'Turning left at the corner, you will find the café.',
          'Seeing the beautiful view, she took out her camera.',
          'Opening the door, he found the room empty.',
          'Being very shy, she found it hard to make friends.',
          'Entering the classroom, the students sat down quietly.',
          'Listening to music, she finished her homework.',
        ]
      },
      {
        title: '가정법 과거 (If + 과거, would/could + 동사원형)',
        sentences: [
          'If I were you, I would accept that great offer.',
          'If she had more time, she would travel the world.',
          'If he were taller, he could join the basketball team.',
          'I wish I could speak Japanese fluently.',
          'If I knew the answer, I would tell you.',
          'She wishes she lived closer to her school.',
          'If we had a car, we could visit them more often.',
          'I wish I had more money to buy that book.',
          'If it were not so cold, I would go outside.',
          'She wishes she were as talented as her sister.',
        ]
      },
      {
        title: '명사절 (that / whether / if)',
        sentences: [
          'I think that she will pass the exam easily.',
          'He believes that hard work leads to success.',
          'She is not sure whether she should accept.',
          'Do you know if he will be at the meeting?',
          'The fact that he lied made everyone angry.',
          'She hopes that the weather will be good.',
          'I doubt whether this plan will really work.',
          'It is clear that she is the best student.',
          'He did not know that the event was cancelled.',
          'She told me that she was feeling much better.',
        ]
      },
      {
        title: '부사절 심화 (시간·이유·조건·양보·결과)',
        sentences: [
          'Although she was tired, she kept on studying.',
          'Even though it was raining, they went for a walk.',
          'She worked so hard that she forgot to eat.',
          'He was such a good speaker that all listened.',
          'Since she arrived early, she had time to prepare.',
          'As long as you try, you will improve.',
          'Unless you hurry, you will miss the train.',
          'Now that the exam is over, she feels relieved.',
          'The movie was so moving that many people cried.',
          'Before she left, she wrote a long thank-you note.',
        ]
      },
      {
        title: '비교 표현 다양화',
        sentences: [
          'She is as diligent as any student in this school.',
          'No other student works as hard as she does.',
          'He is more creative than I had expected.',
          'The later she stays up, the more tired she feels.',
          'She reads more books than anyone else in class.',
          'He is not as experienced as his older colleague.',
          'This is one of the most challenging tests we have.',
          'She improved much more quickly than before.',
          'The longer he practiced, the better he became.',
          'Nothing is as refreshing as a cold drink in summer.',
        ]
      },
      {
        title: '간접화법 (평서문·의문문·명령문)',
        sentences: [
          'She said that she was feeling very tired.',
          'He told me that he had already eaten lunch.',
          'She asked me if I liked classical music.',
          'He asked where I had bought that jacket.',
          'She told him to close the door quietly.',
          'He said he would call me back later.',
          'The teacher told the class not to be noisy.',
          'She asked me what my favorite subject was.',
          'He said that he had never been to Jeju.',
          'She told her friend that she would be late.',
        ]
      },
      {
        title: '5형식 심화 (지각동사·사역동사)',
        sentences: [
          'She made her parents very proud of her.',
          'He saw his friend cross the street carefully.',
          'She heard someone knock on the front door.',
          'They elected her president of the school club.',
          'Good music makes people feel calm and happy.',
          'He had his bicycle repaired at the shop.',
          'She let her brother use her laptop for work.',
          'I noticed him leave the classroom early.',
          'The coach encouraged the team to never give up.',
          'She found the test much easier than expected.',
        ]
      },
    ]
  },

  고1: HG1,

  고2: {
    label: '고등학교 2학년',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    topics: [
      {
        title: '복합관계사 심화 (however / whenever / whichever)',
        sentences: [
          'Whoever breaks the rules will face the consequences.',
          'She will donate whatever money she receives.',
          'However hard he tries, he always makes mistakes.',
          'Whenever she feels sad, she plays the piano.',
          'Whichever road you take, the drive will be beautiful.',
          'Whatever you decide, I will stand by your side.',
          'However difficult it may seem, do not give up.',
          'Whenever I see her, she is always smiling.',
          'Whichever team wins, the game will be exciting.',
          'However busy he is, he always finds time to read.',
        ]
      },
      {
        title: '병렬구조 심화',
        sentences: [
          'She is intelligent, creative, and highly motivated.',
          'He not only worked hard but also inspired others.',
          'Reading widely, thinking deeply, and writing clearly are essential.',
          'She likes swimming, hiking, and playing tennis.',
          'To succeed, you must plan carefully and act decisively.',
          'Neither the students nor the teacher knew the answer.',
          'He is known for his honesty, his courage, and his wisdom.',
          'She wanted to travel, to learn, and to grow.',
          'Both the quality and the quantity of work matter.',
          'The plan was not only risky but also expensive.',
        ]
      },
      {
        title: '동격 표현 (that절 / 명사 동격)',
        sentences: [
          'The fact that she passed surprised everyone.',
          'He had no idea that the meeting had started.',
          'The news that he would retire shocked his fans.',
          'She rejected the idea that money equals happiness.',
          'The belief that effort matters keeps her motivated.',
          'He was unaware of the fact that she had left.',
          'The rumor that the school would close was false.',
          'She held on to the hope that things would improve.',
          'The assumption that she was guilty was wrong.',
          'He could not accept the idea that he had failed.',
        ]
      },
      {
        title: '부정구문 심화 (partial / double negation)',
        sentences: [
          'Not all students who study hard get good grades.',
          'She is not always right, but she always tries.',
          'Neither he nor his brother attended the ceremony.',
          'Nothing is more important than your health.',
          'She could not help laughing at his funny joke.',
          'He never takes things for granted in his life.',
          'Not a single person objected to the new proposal.',
          'Both answers are not correct — only one is.',
          'Not every effort leads to immediate success.',
          'She did not say anything but she was not happy.',
        ]
      },
      {
        title: '혼합가정법 (과거→현재)',
        sentences: [
          'If she had taken that opportunity, she would be famous now.',
          'If he had slept more last night, he would not be tired now.',
          'If I had saved money then, I would be rich now.',
          'If they had trained harder, they would be winning now.',
          'If she had learned to drive, she could go alone.',
          'If he had followed advice, he would have a better job.',
          'If we had left on time, we would already be there.',
          'If she had studied medicine, she would be a doctor now.',
          'Had he invested wisely then, he would be comfortable now.',
          'If I had taken that class, I could help you now.',
        ]
      },
      {
        title: '조동사 + have p.p. 심화',
        sentences: [
          'She should have told the truth from the beginning.',
          'He must have been very tired after the marathon.',
          'They cannot have finished the project so quickly.',
          'I should have listened to my teacher\'s advice.',
          'She may have left her phone on the bus.',
          'He could have avoided the accident if careful.',
          'They must have been waiting for a very long time.',
          'She need not have worried so much about the test.',
          'He ought to have checked the schedule beforehand.',
          'We might have made a different decision with more data.',
        ]
      },
      {
        title: '명사절 심화 (whether / what / how)',
        sentences: [
          'Whether she will attend the event is still unknown.',
          'What he said at the meeting was very surprising.',
          'It remains to be seen whether the plan will work.',
          'The question is whether we have enough time left.',
          'She was not sure if she had made the right choice.',
          'What makes a great leader is still widely debated.',
          'It is uncertain whether he will recover quickly.',
          'That she succeeded despite all odds is remarkable.',
          'How they solved the problem is still a mystery.',
          'Whether we win or lose, the experience matters.',
        ]
      },
      {
        title: '부사절 심화 (양보·이유·목적·결과)',
        sentences: [
          'Although she was tired, she kept studying until dawn.',
          'Even though it was raining, they went for a walk.',
          'She worked so hard that she forgot to eat lunch.',
          'He was such a good speaker that everyone listened.',
          'In spite of the difficulty, she never stopped trying.',
          'As she had more experience, she got the job offer.',
          'The movie was so moving that many people cried.',
          'She studied hard so that she could get a scholarship.',
          'Since he had prepared well, he answered confidently.',
          'As a result of her effort, she won the competition.',
        ]
      },
      {
        title: '수동태 고급 (4형식·5형식·이중목적어)',
        sentences: [
          'She was given a bouquet of flowers by the students.',
          'He was made captain of the team by the coach.',
          'They were asked to submit the report by Friday.',
          'She was called the best teacher of the year.',
          'He was seen to enter the building alone.',
          'She was told to wait outside the principal\'s office.',
          'The children were taught to be honest and kind.',
          'He was found to have broken the school rules.',
          'She was elected the head of the student council.',
          'He was believed to be the most talented student.',
        ]
      },
      {
        title: '원급·비교급으로 최상급 표현',
        sentences: [
          'No other mountain in Korea is as high as Baekdu.',
          'She is more creative than any other student here.',
          'Nothing is more precious than time and good health.',
          'He is as diligent as any student in this school.',
          'No one runs faster than she does on the team.',
          'This is more impressive than anything I have seen.',
          'She works harder than everyone else in the office.',
          'There is nothing as refreshing as a cold drink.',
          'No other city is as vibrant as this one.',
          'He is better at math than any student in the grade.',
        ]
      },
      {
        title: '특수구문 종합 (도치·강조·생략)',
        sentences: [
          'So great was his effort that he succeeded at last.',
          'Not until she left did he realize how much he cared.',
          'It was not money but passion that drove her forward.',
          'Only after the meeting did they understand the plan.',
          'Such was her talent that she became famous overnight.',
          'Had she known the truth, she would have acted differently.',
          'Not a word did he say during the entire meeting.',
          'It is kindness, not wealth, that makes people happy.',
          'Only by working together can we solve this problem.',
          'So difficult was the question that nobody could answer it.',
        ]
      },
      {
        title: '접속부사 활용 (therefore / however / moreover)',
        sentences: [
          'She studied hard; therefore, she passed the exam.',
          'The plan seemed good; however, it had some flaws.',
          'He was tired; nevertheless, he finished the work.',
          'She arrived late; moreover, she forgot the report.',
          'The weather was bad; nonetheless, they went hiking.',
          'He apologized sincerely; thus, she forgave him.',
          'The evidence was weak; in spite of this, they proceeded.',
          'She lacked experience; however, she showed great potential.',
          'The plan failed; therefore, a new approach was needed.',
          'He was nervous; nonetheless, he delivered the speech well.',
        ]
      },
      {
        title: '분사 고급 (독립분사구문·with + 명사 + 분사)',
        sentences: [
          'With her arms crossed, she listened to the speech.',
          'With the sun setting, the sky turned brilliant orange.',
          'She sat at her desk, her eyes fixed on the screen.',
          'With all the work done, they finally relaxed.',
          'The storm having passed, people came out of their homes.',
          'He walked down the street, his hands in his pockets.',
          'With tears running down her face, she read the letter.',
          'His voice trembling, he delivered the difficult news.',
          'With the deadline approaching, everyone worked faster.',
          'She waited, her heart beating faster and faster.',
        ]
      },
    ]
  },

  고3: {
    label: '고등학교 3학년',
    color: 'bg-red-50 border-red-200 text-red-700',
    badge: 'bg-red-100 text-red-700',
    topics: [
      {
        title: '수능 필수 — 복잡한 주어부',
        sentences: [
          'What makes humans unique is our ability to use complex language.',
          'The fact that knowledge is power has been proven throughout history.',
          'How we respond to failure determines our future success.',
          'That she would someday lead the company surprised no one.',
          'Whether or not you agree does not change the reality.',
          'What we believe about ourselves shapes everything we do.',
          'How children learn language so quickly remains a mystery.',
          'The way in which she handled the crisis impressed everyone.',
          'Whether technology improves our lives depends on how we use it.',
          'What distinguishes great thinkers is not talent but curiosity.',
        ]
      },
      {
        title: '수능 필수 — 복잡한 관계사절',
        sentences: [
          'It is not until we lose something that we realize its value.',
          'The scientist whose research led to the discovery won the prize.',
          'This is the very place where the historic agreement was signed.',
          'She is the kind of person who never gives up easily.',
          'The moment when she realized the truth changed everything.',
          'He brought with him everything that was needed for the trip.',
          'The reason why great art endures is its universal truth.',
          'What she accomplished is something that no one had done before.',
          'This is the city in which she spent her most creative years.',
          'The theory that he proposed has since been widely accepted.',
        ]
      },
      {
        title: '수능 필수 — 분사구문 고급',
        sentences: [
          'Having spent years studying the issue, she wrote a groundbreaking paper.',
          'Largely ignored by the public, the artist continued to create.',
          'The experiment having failed twice, they decided to change the method.',
          'Having been raised in poverty, he understood the value of education.',
          'Given the circumstances, her decision was entirely understandable.',
          'Judging from his expression, something must have gone very wrong.',
          'Taken as a whole, the results are more promising than expected.',
          'Having worked in the field for decades, she is a true expert.',
          'Left alone, he finally had time to think clearly.',
          'Seen in this light, the problem appears far less serious.',
        ]
      },
      {
        title: '수능 필수 — 도치와 강조 고급',
        sentences: [
          'Little did they know that their lives were about to change.',
          'No sooner had he arrived than the meeting began without him.',
          'Not only is she talented, but she is also incredibly hardworking.',
          'So complex is the human brain that scientists are still studying it.',
          'Only by working together can we solve this global problem.',
          'Never before had the world witnessed such rapid technological change.',
          'Rarely does a scientific discovery change society so dramatically.',
          'Under no circumstances should you reveal this information to others.',
          'Not until she had spoken did anyone understand the full situation.',
          'Such was the scale of the disaster that aid poured in from everywhere.',
        ]
      },
      {
        title: '수능 필수 — 가정법 고급',
        sentences: [
          'Had it not been for her help, I could not have succeeded.',
          'Without his guidance, she would never have found the right path.',
          'If only I had listened to the advice that was given to me.',
          'But for the timely intervention, the situation could have been worse.',
          'Were it not for modern medicine, many diseases would be fatal.',
          'I wish the world were a more peaceful and just place.',
          'If she had taken that opportunity, she would be famous now.',
          'Had the scientists not collaborated, the vaccine would not exist.',
          'Were she to try again, she would certainly do better.',
          'If only we had more time, we could do so much more.',
        ]
      },
      {
        title: '수능 필수 — 병렬구조와 생략 고급',
        sentences: [
          'She is not only a gifted writer but also an inspiring teacher.',
          'The more we read, the more we understand the world around us.',
          'He ran, jumped, and dove into the cold water without hesitating.',
          'She wanted to travel, to learn, and to grow as a person.',
          'Both the quality of content and the method of delivery matter.',
          'The harder you work, the luckier you tend to become.',
          'To succeed, you must be willing to fail and to learn.',
          'She was exhausted but proud after finishing the marathon.',
          'He not only apologized but also offered to make it right.',
          'The task requires not just skill but also patience and persistence.',
        ]
      },
      {
        title: '수능 필수 — 추상명사와 동격',
        sentences: [
          'The assumption that success requires sacrifice is widely shared.',
          'There is growing evidence that exercise improves mental health.',
          'She challenged the notion that intelligence is fixed at birth.',
          'He held the conviction that justice would prevail in the end.',
          'The belief that hard work always pays off drives many people.',
          'There is no doubt that climate change is our biggest challenge.',
          'The possibility that life exists elsewhere fascinates scientists.',
          'She questioned the idea that progress is always beneficial.',
          'The principle that all people are equal forms our foundation.',
          'There is a widespread view that education is the key to freedom.',
        ]
      },
      {
        title: '수능 필수 — 논리 연결과 글 전개',
        sentences: [
          'Despite the obstacles she faced, she never abandoned her dream.',
          'In contrast to his brother, he prefers quiet activities like reading.',
          'As a result of her persistent effort, she achieved remarkable success.',
          'While technology offers many benefits, it also poses serious risks.',
          'The more societies urbanize, the more important green spaces become.',
          'Far from being a weakness, vulnerability is a form of courage.',
          'In addition to being talented, she is also genuinely humble.',
          'Rather than giving up, she chose to face the challenge directly.',
          'Not only does exercise improve fitness, but it also boosts mood.',
          'Contrary to popular belief, multitasking reduces overall productivity.',
        ]
      },
      {
        title: '수능 고난도 — 복합문장 종합 1',
        sentences: [
          'It was not until she had overcome every obstacle that she realized her true potential.',
          'Having devoted her entire career to research that few understood, she was finally recognized.',
          'The reason why some people succeed where others fail often comes down to resilience.',
          'No matter how many times he failed, he never lost faith in what he was doing.',
          'What sets truly exceptional people apart is not what they do when things are easy.',
          'Had the scientists not collaborated across borders, the vaccine would not have been developed.',
          'So profound was the impact of her work that it reshaped the entire field of study.',
          'Not until the results were published did the scientific community grasp the significance.',
          'The fact that she managed to succeed under such difficult conditions inspired everyone.',
          'Whatever challenges lie ahead, the skills she has built will carry her through.',
        ]
      },
      {
        title: '수능 고난도 — 복합문장 종합 2',
        sentences: [
          'The more we understand about the brain, the more we realize how much remains unknown.',
          'What appears to be a simple decision often involves deeply complex considerations.',
          'Only when we accept our limitations can we begin to truly grow beyond them.',
          'Having been told repeatedly that she was not good enough, she worked twice as hard.',
          'It is not so much what you say as how you say it that makes the difference.',
          'The discoveries made possible by this technology have far exceeded what anyone predicted.',
          'Were it not for the contributions of countless unknown individuals, history would look different.',
          'Such is the power of language that a single word can change the course of events.',
          'Not only has the research challenged existing assumptions, but it has opened new questions.',
          'The challenge for future generations will be not just to innovate but to innovate responsibly.',
        ]
      },
    ]
  }
}

export const GRADE_ORDER = ['중1', '중2', '중3', '고1', '고2', '고3']
