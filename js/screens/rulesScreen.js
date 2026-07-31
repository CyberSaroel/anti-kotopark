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
    <p>Цель игры — угадать социотипы всех котов, наблюдая за их настроением при перемещении.</p>

    <h2>1. Что находится на поле</h2>
    <ul>
      <li>10 котов с номерами (1-10) — у каждого кота есть свой социотип, который нужно угадать;</li>
      <li>один кот имеет известный социотип (показан внизу клетки);</li>
      <li>у остальных котов вместо социотипа стоит вопросительный знак "?";</li>
      <li>пустые клетки с травой — по ним коты могут ходить.</li>
    </ul>

    <h2>2. Как ходить</h2>
    <p>Нажмите на кота, которого хотите передвинуть. После выбора кота игра подсветит клетки, куда он может пойти.</p>
    <p>Кот может переместиться только на одну соседнюю пустую клетку: вверх, вниз, влево, вправо или по диагонали.</p>
    <p>Кот не может прыгать через клетки или вставать на клетку, где уже стоит другой кот.</p>

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

    <p>Кто кому кем приходится по интертипным отношениям: <a href="https://isocionics.com/library/intertype/table_intro" target="_blank" rel="noopener noreferrer">https://isocionics.com/library/intertype/table_intro</a></p>

    <h2>5. Цвета настроения</h2>
    <ul>
      <li>-2 — очень недоволен, тёмно-красный кот.</li>
      <li>-1 — недоволен, красный кот.</li>
      <li>0 — нейтральный, жёлтый кот.</li>
      <li>+1 — доволен, зелёный кот.</li>
      <li>+2 — очень доволен, ярко-зелёный кот.</li>
    </ul>

    <h2>6. Как угадывать социотипы</h2>
    <p>Кликните на кота с вопросительным знаком "?". В левой панели откроется список всех 16 социотипов.</p>
    <p>Выберите социотип, который, по вашему мнению, соответствует этому коту.</p>
    <p>Если вы угадали правильно — социотип отобразится внизу клетки кота, и он будет считаться разгаданным.</p>
    <p>Если вы ошиблись — игра покажет правильный социотип, но кот не будет считаться разгаданным.</p>

    <h2>7. Как выиграть</h2>
    <p>Игра выиграна, когда вы угадали социотипы всех 10 котов.</p>

    <h2>8. Полезная стратегия</h2>
    <ul>
      <li>перемещайте котов и наблюдайте за изменением их настроения;</li>
      <li>используйте известный социотип первого кота как отправную точку;</li>
      <li>если кот становится зелёным рядом с другим — скорее всего, у них хорошие отношения;</li>
      <li>если кот становится красным рядом с другим — у них плохие отношения;</li>
      <li>анализируйте паттерны настроения, чтобы исключать неподходящие социотипы.</li>
    </ul>

    <h2>9. Главное правило</h2>
    <p>Если все социотипы угаданы — победа!</p>
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
