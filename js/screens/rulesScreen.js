import { audioManager } from "../core/audioManager.js";
import NavigationService from "../core/navigation.js";

export function showRulesScreen(root) {
  root.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.id = "intro-screen";

  const title = document.createElement("h1");
  title.textContent = "Правила игры";
  title.style.textAlign = "center";
  title.style.marginBottom = "20px";

  const content = document.createElement("div");
  content.className = "rules-content";
  content.style.maxWidth = "800px";
  content.style.margin = "0 auto 30px auto";
  content.style.padding = "0 20px";
  content.style.lineHeight = "1.6";

  content.innerHTML = `
    <p>Цель игры — расставить котов так, чтобы все они стали довольными: зелёными или ярко-зелёными.</p>

    <h2>1. Что находится на поле</h2>
    <ul>
      <li>коты — у каждого кота есть свой соционический тип;</li>
      <li>пустые клетки с травой — по ним коты могут ходить;</li>
      <li>клетки с водой — по ним коты ходить не могут.</li>
    </ul>

    <h2>2. Как ходить</h2>
    <p>Нажмите на кота, которого хотите передвинуть. После выбора кота игра подсветит клетки, куда он может пойти.</p>
    <p>Кот может переместиться только на одну соседнюю пустую клетку: вверх, вниз, влево, вправо или по диагонали.</p>
    <p>Кот не может прыгать через клетки, ходить по воде или вставать на клетку, где уже стоит другой кот.</p>

    <h2>3. От чего зависит настроение котов</h2>
    <p>Настроение кота зависит от того, какие коты стоят рядом с ним. Считаются все соседние клетки вокруг кота (по горизонтали, вертикали и диагонали) — максимум 8 соседей.</p>
    <p>Каждый сосед влияет на настроение в зависимости от соционических отношений между типами. Хорошие отношения улучшают настроение, плохие ухудшают, нейтральные не меняют.</p>

    <h2>4. Таблица эффектов соседей</h2>
    <table style="width:100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc; padding:8px; text-align:left;">Отношение между котами</th>
          <th style="border:1px solid #ccc; padding:8px; text-align:right;">Эффект</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="border:1px solid #ccc; padding:8px;">Тождество</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Дуальность</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+2</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Активация</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+2</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Зеркальность</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Мираж</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Полудуальность</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Заказчик</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Подзаказной</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">+1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Ревизор</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">0</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Деловые</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">0</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Родственные</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">-1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Квазитождество</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">-1</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Подревизный</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">-2</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Конфликт</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">-2</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Суперэго</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">-2</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Полная противоположность</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">-2</td></tr>
      </tbody>
    </table>

    <p>Важно: настроение считается для каждого кота отдельно. Например, в отношениях ревизии ревизор получает 0, а подревизный -2. Поэтому один и тот же сосед может быть безвреден для одного кота, но неприятен для другого.</p>

    <p>Кто кому кем приходится по интертипным отношениям: <a href="https://isocionics.com/library/intertype/table_intro" target="_blank" rel="noopener noreferrer">https://isocionics.com/library/intertype/table_intro</a></p>

    <p>Сочетание некоторых типов улучшает комфорт одних, но ухудшает комфорт их соседей.</p>
    <p>Если сводить соседей по квадре — это всегда беспроигрышный вариант, т.к. ни один квадрал не ухудшает настроения другого квадрала.</p>
    <p>Какой социотип относится к какой квадре: <a href="https://isocionics.com/library/quadras_values" target="_blank" rel="noopener noreferrer">https://isocionics.com/library/quadras_values</a></p>

    <h2>5. Цвета настроения</h2>
    <ul>
      <li>-6 — очень недоволен, тёмно-красный кот с царапиной на левой щеке и правой щеке, и надкусанным левым и правым ухом</li>
      <li>-5 — очень недоволен, тёмно-красный кот с царапиной на левой щеке и правой щеке, и надкусанным левым ухом</li>
      <li>-4 — очень недоволен, тёмно-красный кот с царапиной на левой щеке и правой щеке</li>
      <li>-3 — очень недоволен, тёмно-красный кот с царапиной на левой щеке</li>
      <li>-2 — очень недоволен, тёмно-красный кот.</li>
      <li>-1 — недоволен, красный кот.</li>
      <li>0 — нейтральный, жёлтый кот.</li>
      <li>+1 — доволен, зелёный кот.</li>
      <li>+2 — очень доволен, ярко-зелёный зубастый кот.</li>
      <li>+3 — очень доволен, ярко-зелёный зубастый кот с золотым зубом.</li>
      <li>+4 — очень доволен, ярко-зелёный зубастый кот с золотым зубом, и в шляпе</li>
      <li>+5 — очень доволен, ярко-зелёный зубастый кот с золотым зубом, и в шляпе и с сережками в ушах</li>
      <li>+6 — очень доволен, кот-король. Именно к этому состоянию надо довести как можно большее число котов в игре!</li>
    </ul>
    <p>Если сумма больше +6, настроение считается как +6. Если меньше -6 — как -6.</p>

    <h2>6. 👑 Короли и рыбки 👑</h2>
    <p>Это главное нововведение «Королевского котопарка».</p>
    <p>Каждый кот, достигший настроения +6, становится королём.</p>
    <p>После успешного прохождения уровня:</p>
    <ul>
      <li>👑 все полученные короли засчитываются в общую статистику; 👑</li>
      <li><img class="fish-icon" src="assets/icons/fish.png" alt=""> за каждого короля начисляется одна рыбка. <img class="fish-icon" src="assets/icons/fish.png" alt=""></li>
    </ul>
    <p>Рыбки можно использовать на любом следующем уровне.</p>
    <p>Одна рыбка даёт:</p>
    <ul>
      <li>+10 ходов</li>
      <li>+20 секунд</li>
    </ul>
    <p>Короли — постоянный показатель вашего мастерства.</p>
    <p>Рыбки — расходуемый ресурс.</p>

    <h2>7. 🏆 Как пройти уровень 🏆</h2>
    <p>Есть два уровня мастерства.</p>
    <p><strong>✅ Простое прохождение ✅</strong></p>
    <p>Все коты должны стать зелёными (+1 и выше).</p>
    <p><strong>👑 Идеальное прохождение 👑</strong></p>
    <p>Не только пройти уровень, но и превратить максимальное количество котов в королей.</p>
    <p>Именно общее число королей определяет место игрока в рейтинге.</p>

    <h2>8. 💡 Полезные советы 💡</h2>
    <ul>
      <li>объединяйте совместимых котов;</li>
      <li>разводите конфликтующих;</li>
      <li>используйте воду как естественную перегородку;</li>
      <li>сначала создайте устойчивую группу счастливых котов, затем постепенно присоединяйте остальных;</li>
      <li>иногда выгоднее потратить несколько рыбок сейчас, чтобы заработать ещё больше королей на следующих уровнях.</li>
    </ul>

  `;

  const backBtn = document.createElement("button");
  backBtn.className = "back-btn";
  backBtn.textContent = "← Назад";
  backBtn.style.padding = "10px 45px";
  backBtn.addEventListener("click", () => {
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.goBack();
  });

  overlay.appendChild(title);
  overlay.appendChild(backBtn);
  overlay.appendChild(content);
  root.appendChild(overlay);

  NavigationService.saveCurrentRender(() => showRulesScreen(root));
}
