// 界面语言。中文是源文案，英文按中文原句查表；查不到就显示中文。
// 房间语言由创建房间的人决定，进入房间后界面跟随房间语言。
(function () {
  'use strict';

  const EN = {
    '心有灵犀 · 双人猜词': 'In Sync · A two-player word game',
    '心有灵犀': 'In Sync',
    '两个人，从同一个词出发，边想边说，直到想到同一个词。': 'Two players start from one word and think aloud until they land on the same word.',
    '你的名字': 'Your name',
    '怎么称呼你': 'What should we call you?',
    '游戏语言': 'Game language',
    '和谁玩': 'Play with',
    '和朋友玩': 'A friend',
    '和 AI 玩': 'The AI',
    '开始和 AI 对局': 'Start a game with the AI',
    '和 AI 一起玩，不需要房间号。': 'You’ll play with the AI. No room code needed.',
    '与 AI 对局': 'Playing with the AI',
    'AI 已经就位，你准备好就开始。': 'The AI is ready. The game starts when you are.',
    'AI 没能给出回复，本局提前结束。': 'The AI couldn’t reply, so the game ended early.',
    'AI 对手暂时不可用': 'The AI opponent isn’t available right now',
    '给一个词': 'Give a word',
    '不给词': 'No word',
    '语言和起始词由先进入房间的人决定，后进来的人自动跟随。': 'Whoever enters the room first sets the language and start word; the second player follows.',
    '四位房间号': 'Four-digit room code',
    '随机一个': 'Pick one for me',
    '进入房间': 'Enter room',
    '和同伴输入相同的房间号就能匹配到一起。': 'Enter the same code as your partner to be matched.',
    '正在连接…': 'Connecting…',
    '服务器正在启动，首次可能要等近一分钟…': 'The server is starting up. The first visit can take up to a minute…',
    '连不上服务器，请检查网络后重试': 'Can’t reach the server. Check your connection and try again.',
    '开局会出现一个随机词，两人各自由它联想下一个词；选“不给词”时，第一轮两人各自随便想一个词。': 'A random word appears and each of you thinks of a word it leads to. With “No word”, you each simply think of any word in round one.',
    '思考时请把想法说出来，系统会把语音转成文字保存（不保存录音）。': 'Say your thoughts out loud while you think. Your speech is saved as text; no audio is kept.',
    '倒计时结束后，各自输入一个词提交；两人都提交后互相看到对方的词，再继续联想。': 'When the countdown ends, each of you submits one word. Once you’ve both submitted, you see each other’s words and go again.',
    '没对上扣一格血；血扣完之前两人输入了同一个词，就算获胜。': 'A mismatch costs one life. Enter the same word before the lives run out and you win.',

    '房间号': 'Room code',
    '把这个号码告诉同伴': 'Share this code with your partner',
    '（你）': ' (you)',
    '等待同伴加入…': 'Waiting for a partner…',
    '把房间号发给对方': 'Send them the room code',
    '掉线了': 'Disconnected',
    '已准备': 'Ready',
    '未准备': 'Not ready',
    '准备': 'Ready',
    '已准备 · 点击取消': 'Ready · tap to cancel',
    '先完成语音识别检测': 'Finish the speech check first',
    '离开房间': 'Leave room',
    '本局规则：{lives} 格血，每轮思考 {think} 秒{input}{repeat}。两人都准备后自动开始。': 'This game: {lives} lives, {think} seconds to think each round{input}{repeat}. It starts when you’re both ready.',
    '，输入限时 {seconds} 秒': ', {seconds} seconds to type',
    '，不能用出现过的词': ', no reusing words',

    '语音识别检测': 'Speech recognition check',
    '点击“开始检测”，允许使用麦克风，然后随便说一句话。': 'Press “Start check”, allow the microphone, then say anything.',
    '正在听…请对着麦克风说一句话。': 'Listening… say something into the microphone.',
    '语音识别正常。': 'Speech recognition is working.',
    '麦克风权限被拒绝了。请在浏览器地址栏里允许使用麦克风，然后刷新页面。': 'Microphone access is turned off. Allow it in the browser’s address bar, then reload the page.',
    '语音识别服务连不上。请检查麦克风和网络，或换用 Chrome / Edge / Safari。': 'Can’t reach the speech recognition service. Check your microphone and connection, or try Chrome, Edge or Safari.',
    '这个浏览器不支持语音识别，请换用 Chrome、Edge 或 Safari。': 'This browser doesn’t support speech recognition. Use Chrome, Edge or Safari.',
    '听到：{text}': 'Heard: {text}',
    '开始检测': 'Start check',
    '停止检测': 'Stop check',
    '再测一次': 'Check again',

    '第 {n} 轮': 'Round {n}',
    '剩余 {lives} / {max} 格血': '{lives} of {max} lives left',
    '秒': 's',
    '起始词': 'Start word',
    '没有起始词': 'No start word',
    '随便想一个词，把你的思路说出来': 'Think of any word at all, and say your thoughts out loud.',
    '本局不给起始词，第一轮各自随便想一个词。': 'No start word this game: in round one you each think of any word.',
    '你上一轮写的': 'Your last word',
    '{name} 写的': '{name}’s word',
    '对方': 'Partner',
    '（没写）': '(nothing)',
    '由这个词想到下一个词，把你的思路说出来': 'What word does this lead you to? Think out loud.',
    '猜猜你们会想到哪个共同的词，把思路说出来': 'What word will you both land on? Think out loud.',
    '时间到之前提交你的词': 'Submit your word before time runs out',
    '想好了随时可以提交，不用等倒计时': 'Submit whenever you’re ready, no need to wait',
    '倒计时结束后才能输入': 'You can enter your word when the countdown ends',
    '思考时间还没结束': 'The thinking time isn’t over yet',
    '时间到了，请输入你想到的词': 'Time’s up. Enter your word.',
    '一个词': 'One word',
    '提交': 'Submit',
    '你写的是「{word}」': 'You wrote “{word}”',
    '等待对方提交…': 'Waiting for your partner…',
    '本轮已提交': 'Submitted for this round',
    '正在听你说（只保存文字，不保存录音）': 'Listening (text only, no audio is saved)',
    '正在听你说（录音只用于转写成文字，转写后不保留）': 'Listening (audio is only used to make a transcript and is not kept)',
    '此浏览器不支持语音识别': 'This browser doesn’t support speech recognition',
    '麦克风权限被拒绝，无法转写': 'Microphone is off, so nothing is being transcribed',
    '语音识别未启动': 'Speech recognition is off',
    '{name} 掉线了，等待重连…': '{name} disconnected. Waiting for them to return…',
    '{name} 已经提交了': '{name} has submitted',
    '{name} 还没提交…': '{name} hasn’t submitted yet…',
    '退出房间（本局立刻结束）': 'Leave room (ends the game now)',
    '退出后本局会立刻结束，对方也会看到对局结束。确定退出吗？': 'Leaving ends the game right away for both of you. Leave?',
    '没对上，扣一格血': 'No match. One life lost.',
    '对方离开了房间': 'Your partner left the room',
    '提交失败，请重试': 'Couldn’t submit. Try again.',
    '第{n}轮': 'R{n}',
    '你': 'You',

    '灵犀': 'Yes!',
    '散场': 'Bye',
    '可惜': 'Oops',
    '心有灵犀！': 'In sync!',
    '对局已结束': 'Game over',
    '血量耗尽': 'Out of lives',
    '你们在第 {round} 轮同时想到了「{word}」，还剩 {lives} 格血。': 'You both thought of “{word}” in round {round}, with {lives} lives left.',
    '{name} 退出了房间，本局提前结束。': '{name} left the room, so the game ended early.',
    '{max} 格血用完了，这次没能想到一起。': 'All {max} lives are gone. You didn’t land on the same word this time.',
    '再来一局': 'Play again',
    '回到房间等新同伴': 'Back to the room to wait for a partner',
    '连接中断，正在重连…': 'Connection lost. Reconnecting…',

    '服务器开小差了，请稍后再试': 'The server had a problem. Try again shortly.',
    '房间不存在或已过期，请重新输入房间号': 'That room doesn’t exist or has expired. Enter a room code again.',
    '你不在这个房间里，请重新加入': 'You’re not in this room any more. Join again.',
    '房间号必须是 4 位数字': 'The room code must be four digits',
    '这个房间已经有两位玩家了，换一个房间号试试': 'That room already has two players. Try another code.',
    '这一轮已经结束了': 'That round is already over',
    '你已经提交过这一轮的词了': 'You’ve already submitted a word this round',
    '请输入一个词': 'Enter a word',
    '词太长了': 'That word is too long',
    '这个词已经出现过了，换一个吧': 'That word has already come up. Try another.',
  };

  // 后端返回的错误代码对应的中文原句。
  const ERRORS = {
    room_not_found: '房间不存在或已过期，请重新输入房间号',
    not_in_room: '你不在这个房间里，请重新加入',
    bad_code: '房间号必须是 4 位数字',
    room_full: '这个房间已经有两位玩家了，换一个房间号试试',
    round_over: '这一轮已经结束了',
    already_submitted: '你已经提交过这一轮的词了',
    empty_word: '请输入一个词',
    word_too_long: '词太长了',
    word_used: '这个词已经出现过了，换一个吧',
    too_early: '思考时间还没结束',
    ai_unavailable: 'AI 对手暂时不可用',
  };

  const Lang = {
    current: 'zh',
    /** Translate a Chinese source string, filling {placeholders} from values. */
    tr(source, values) {
      const text = this.current === 'en' && EN[source] != null ? EN[source] : source;
      return text.replace(/\{(\w+)\}/g, (match, name) => (values && values[name] != null ? values[name] : ''));
    },
    error(code) { return this.tr(ERRORS[code] || '服务器开小差了，请稍后再试'); },
    /** Switch language and retranslate every element marked with data-tr / data-tr-placeholder. */
    set(lang) {
      this.current = lang === 'en' ? 'en' : 'zh';
      document.documentElement.lang = this.current === 'en' ? 'en' : 'zh-CN';
      document.title = this.tr('心有灵犀 · 双人猜词');
      document.querySelectorAll('[data-tr]').forEach((node) => { node.textContent = this.tr(node.dataset.tr); });
      document.querySelectorAll('[data-tr-placeholder]').forEach((node) => { node.placeholder = this.tr(node.dataset.trPlaceholder); });
    },
  };
  window.Lang = Lang;
})();
