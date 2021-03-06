const util = require('util')
const execute = util.promisify(require('child_process').exec)
const c = require('ansi-colors')

async function exec(command){
  console.log(c.dim(`Running command: `) + c.green(command))
  return await execute(command)
}

async function getLocData(){
  const commits = []
  const config = {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
		options: {
			responsive: true,
			title: {
				display: true,
				text: 'Lines of Code in Git Repository'
			},
			scales: {
				xAxes: [{
					display: true,
          scaleLabel: {
            display: true,
            labelString: 'Date'
          },
				}],
				yAxes: [{
					display: true,
					type: 'logarithmic',
          scaleLabel: {
							display: true,
							labelString: 'Lines of Code'
					},
          ticks: {
            callback: function (value, index, values) {
              if (value === 1000000) return "1M"
              if (value === 100000) return "100K"
              if (value === 10000) return "10K"
              if (value === 1000) return "1K"
              if (value === 100) return "100"
              if (value === 10) return "10"
              if (value === 0) return "0"
              return null;
           }
          }
			  }]
			},
/*
    	tooltips: {
    		intersect: false,
    		mode: 'index',
    		callbacks: {
    			label(tooltipItem, data) {
    				const dataset = data.datasets[tooltipItem.datasetIndex];
  	  			const point = dataset.data[tooltipItem.index];

			    	if (!helpers.isNullOrUndef(point.y)) {
    					return Chart__default['default'].defaults.tooltips.callbacks.label(tooltipItem, data);
		    		}

    				const {o, h, l, c} = point;

		    		return 'O: ' + o + '  H: ' + h + '  L: ' + l + '  C: ' + c;
			    }
    		}
    	}
*/
		}
  }
  const diff = (await exec('git diff')).stdout
  if(diff.length > 0){
    console.log(c.red.bold("Detected uncommited changes, please commit changes before running the lines of code counter"))
    return
  }
  var languages = []
  const workingBranch = (await exec('git rev-parse --abbrev-ref HEAD')).stdout
  console.log(c.bold(`Detected working branch: `) + c.green.bold(workingBranch))
  const gitLog = await exec('git log')
    .then((res) => {
      return res.stdout.matchAll(/commit (?<hash>.*)/g)
    })
  for (commit of gitLog){
    await exec(`git checkout ${commit.groups.hash}`)
    const obj = {
      date: (await exec('git show -s --format=%cI')).stdout,
      hash: commit.groups.hash,
      linesOfCode: JSON.parse((await exec('snap run scc --format json')).stdout, null, 2),
//      linesOfCode: (await exec('snap run scc --format json')).stdout,
      timestamp: (await exec('git show -s --format=%ct')).stdout,
    }
    commits.unshift(obj)
  }

//  console.log(c.bold(`Switching back to original commit: ${c.green(commits[commits.length - 1].hash)}`))
//  await exec(`git checkout ${commits[commits.length - 1].hash}`)
  console.log(c.bold(`Switching back to working branch: ${c.green(workingBranch)}`))
  await exec(`git checkout ${workingBranch}`)

  commits.forEach((commit) => {
    commit.linesOfCode.forEach((language) => {
      if (languages.indexOf(language.Name) < 0){
        languages.push(language.Name)
      }
    })
  })
  function generateRandomColorString(){
    const red = Math.round(0 + Math.random()*255)
    const green = Math.round(0 + Math.random()*255)
    const blue = Math.round(0 + Math.random()*255)
    const opacity = (0.6 + Math.random() / 5).toPrecision(2)
    return `rgba(${red},${green},${blue},${opacity})`
  }
  function generateDatasetObject(label){
    color = generateRandomColorString()
    obj = {
      label: label,
      backgroundColor: color,
      borderColor: color,
      fill: false,
      data: []
    }
    return obj
  }
  languages.forEach(language=>{
    obj = generateDatasetObject(language)
    config.data.datasets.push(obj)
  })
  obj = generateDatasetObject('Total')
  obj.backgroundColor = 'rgba(100,120,140,0.99)'
  obj.borderColor = 'rgba(100,120,140,0.99)'
  config.data.datasets.push(obj)
  commits.forEach((commit) => {
    config.data.labels.push(commit.date)
    var totalCommitLoc = 0
    languages.forEach((language) => {
      const index = config.data.datasets.findIndex((obj)=>{
        return obj.label === language
      })
      const languageStats = commit.linesOfCode.find((obj)=>{return obj.Name === language})
      if(languageStats){
        config.data.datasets[index].data.push(languageStats.Lines)
        totalCommitLoc += languageStats.Lines
      } else {
        config.data.datasets[index].data.push(0)
      }
    })
    const index = config.data.datasets.findIndex((obj)=>{
      return obj.label === 'Total'
    })
    config.data.datasets[index].data.push(totalCommitLoc)
  })
  const json = JSON.stringify(config)
  console.log(json)
}
getLocData()
  
/*
	window.onload = function() {
		var ctx = document.getElementById('canvas').getContext('2d');
		window.myLine = new Chart(ctx, config);
    
    inputNode = document.getElementById('chart')
    outputNode = document.getElementById("outputNode")
    setTimeout(function(){ 
          domtoimage.toPng(inputNode)
      .then(function (dataUrl) {
          var img = new Image();
          img.src = dataUrl;
          document.body.appendChild(img)
      })
      .catch(function (error) {
          console.error('oops, something went wrong!', error);
      });
    }, 3000)

	}

/*
 * SVG
 *


	window.onload = function() {
    var ctx = document.getElementById('canvas').getContext('2d');
    window.myLine = new Chart(ctx, config);

    inputNode = document.getElementById('canvas')
    outputNode = document.getElementById("outputNode")
    setTimeout(function(){ 
      domtoimage.toSvg(inputNode)
        .then(function (dataUrl) {
          outputNode.innerText = dataUrl
        })
    }, 2000)
  }
*/
