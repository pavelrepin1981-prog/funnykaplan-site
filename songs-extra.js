// Дополнения к репертуару: одинаково доступны во всех составах.
(() => {
  const allFormats = ['Акустика', 'Стандарт', 'Леди', 'Премиум', 'Оркестр'];
  const reflex = window.SONGS.find((song) => song.a === 'REFLEX' && song.t === 'NON STOP');

  if (reflex) {
    reflex.t = 'НОНСТОП';
    reflex.f = allFormats;
  }

  window.SONGS.push(
    { a: 'ГРАДУСЫ', t: 'Я ЭТО ТЫ', f: allFormats },
    { a: 'ДЕНИС КЛЯВЕР', t: 'БЕЛОЕ ПЛАТЬЕ', f: allFormats },
    { a: 'ДИНАМИТ', t: 'МОЯ МИ', f: allFormats },
  );
})();
