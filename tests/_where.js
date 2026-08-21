/* Where the built files are.

   Every suite used to name its own path, and 25 of the 38 named an absolute
   one — /sessions/<a sandbox that no longer exists>/mnt/outputs/. They ran
   only because that path was symlinked back to the working folder. Checked out
   of GitHub onto any other machine, two thirds of the suite could not find the
   file it was testing, which made committing the tests a filing exercise
   rather than something anyone could actually run.

   Resolving from __dirname upward means the same suite runs whether the tests
   sit beside the build (the working folder) or one level down in tests/ (the
   repo layout), on any machine, with no symlink and no setup. */
const fs=require("fs"),path=require("path");

const find=name=>{
  let dir=__dirname;
  for(let i=0;i<4;i++){                       // here, ../, ../../, ../../../
    const p=path.join(dir,name);
    if(fs.existsSync(p))return p;
    const up=path.dirname(dir);
    if(up===dir)break;
    dir=up;
  }
  /* Fail loudly and usefully. A suite that silently tests nothing is worse
     than one that refuses to start. */
  throw new Error(
    `Cannot find ${name}. Looked in ${__dirname} and its parents.\n`+
    `Run "python3 build_flounder.py" first — the suites test the BUILD, `+
    `not the template.`);
};

const HTML=find("flounder-search.html");
module.exports={
  /* absolute path, for readFileSync */
  FILE:HTML,
  HTML,
  /* file:// URL, for page.goto */
  URL:"file://"+HTML,
  dir:path.dirname(HTML),
  /* the two authoring tools and the hand-written data files */
  tagger:()=>find("flounder-tagger.html"),
  notes:()=>find("flounder-notes.html"),
  data:n=>find(n),
};
