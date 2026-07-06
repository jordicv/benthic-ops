$.fn.scrollView = function (speed) {
    if (speed == null) {
        speeds = 1500;
    } else {
        speeds = speed;
    }
  return this.each(function () {
    $('html, body').animate({
      scrollTop: ($(this).offset().top)-500
   }, speeds);
  });
}
function limpiar(text){
      var text = text.toLowerCase(); // a minusculas
      text = text.replace(/[áàäâå]/, 'a');
      text = text.replace(/[éèëê]/, 'e');
      text = text.replace(/[íìïî]/, 'i');
      text = text.replace(/[óòöô]/, 'o');
      text = text.replace(/[úùüû]/, 'u');
      text = text.replace(/[ýÿ]/, 'y');
      text = text.replace(/[ñ]/, 'n');
      text = text.replace(/[ç]/, 'c');
      text = text.replace(/['"]/, '');
      text = text.replace(/[^a-zA-Z0-9-]/, ''); 
      text = text.replace(/\s+/, '');
      text = text.replace(/' '/, '');
      text = text.replace(/(_)$/, '');
      text = text.replace(/^(_)/, '');
      text = text.replace(/[.]/, '');
      return text;
   }
function cleanString (st)
{
        var ltr = ['[àáâãä]','[èéêë]','[ìíîï]','[òóôõö]','[ùúûü]','ñ','ç','[ýÿ]','\\s|\\W|_'];
        var rpl = ['a','e','i','o','u','n','c','y',''];
        var str = st.toLowerCase();
        
        for (var i = 0, c = ltr.length; i < c; i++)
        {
        	var rgx = new RegExp(ltr[i],'g');
        	str = str.replace(rgx,rpl[i]);
        }
        
        return str;
}