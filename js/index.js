!async function() {
d3.selection.prototype.attrs = function (attributes) {
  let keys = Object.keys(attributes)
  for (let key of keys) {
    this.attr(key, attributes[key])
  }
}

function getrandom(n = 0, m = 1) { //[n,m]
  return Math.floor(Math.random() * (m - n + 1)) + n
}
//禁止页面选择以及鼠标右键
document.oncontextmenu = function () { return false; };
document.onselectstart = function () { return false; };

/*
原始数据基本格式
[{
  id:Number,
  title:String,
  author:String, //作者 
  ti3cai:String,  //体裁
  ti2cai:String, //题材
  words:[], //那个高维向量
  x:Number, //二维平面上的坐标
  y:Number,
  sentencesLen: [Number] //每句长度（用于主题河流）
  avgSentenceLen: Number //平均句子长度 
  totalWords: Number //总词数
  sensPerSen: [Number] //每句话的情感指数（用于主题河流）
  sens: Number //一篇文章的平均情感指数 
  stopWordFrequency : Number 
  four_wordFrequency : Number
  perplexities : Number
}]

数据格式举例：[{ author: '鲁迅', avgSentenceLen: 10, avgSens: 0.65, stopWordFrequency: 23, four_wordFrequency: 10, perplexities: 12.23}, {...}, {...}, ...]
分别表示： 作者名， 平均词长， 平均情感指数， 停词使用频率， 四字词语使用频率， 困惑度

*/  

const app = new Vue(
  {
    el: "#app",
    data: {
      data: [],
      displayTitle1: false,
      displayTitle2: false,
      displayTitle3: false,
      displayTitle4: false,
      displayTitle5: false, 
      displayTitle6: false,  
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      dataForZhiFangTu: [], 
      attrForZhiFangTu: ['avgSentenceLen', 'avgSens','stopWordFrequency','four_wordFrequency','perplexities'],
      attrForZhiFangTuInChinese: ['平均句子长度', '平均情感指数', '停词使用频率', '四字词语使用频率', '困惑度'],
      size: 10,
      // 对联尺寸
      coupletSize: +localStorage.getItem('coupletSize') || 10, //vw     
      borderSize: 10,
      titleOpacity: 0.3,
      titleColor: 'transparent',
      //设置颜色
      colorOption: ['作者', '题材', '体裁', '无'],
      colorOptionStr: ['author', 'ti2cai', 'ti3cai', 'no'],
      colorOptionState: [false, false, false, true],
      colorCondition: 'no',
      colorLegendTxtArr: [],
      colorLegendColorArr: [],
      //设置大小 
      sizeOption: ['平均句子长度', '全文字数', '情感指数', '无'],
      sizeOptionStr: ['avgSentenceLen', 'totalWords', 'sens', 'no'],
      sizeOptionState: [false, false, false, true],
      sizeCondition: 'no',
      sizeLegendTxtArr: [],
      sizeLegendPointArr: [],
      sizeLegendLen: 5,
      //数据处理
      authorArr: [],
      ti2caiArr: [],
      ti3caiArr: [],
      //节流周期 
      throttleTime: 10,
      //鼠标状态
      mouseDownFlag: false,
      //size的倍率
      sizeMinScale: 0.5,
      sizeMaxScale: 2,
      //选择作者
      authorOptionState: [],
      ti2caiOptionState: [],
      ti3caiOptionState: [],
      //非高亮透明度
      noFocusOpacity: 0.2,
      focusOpacity: 1,
      //shift+左键选框 (假设：按下shift总在按下鼠标之前，松开shift总在松开鼠标以后)
      shiftPressedFlag: false,
      start_x: undefined,
      start_y: undefined,
      end_x: undefined,
      end_y: undefined,
      //文本信息卡片
      cardDisplayFlag: false,
      //主题河流
      currentAttrForRiver : 'sentencesLen',
      tickNum : 11,
      txtAnalyseMagnifyFlag : false,
      colorLegendTxtArrForRiver : [],
      colorLegendColorArrForRiver: [],
      //词频统计
      wordFrequencyArr : [],
      showAnalyseFlag : false,
      //直方图
      currentAttrForHistogram : 'avgSentenceLen',
    },
    created() {
    },
    async mounted() { //等待加载数据，定义异步函数
      //less变量设置  
      this.setInitLessVar() 
      //做一个假数据(title + 坐标) 
      // this.makedata()
      //读取JSON数据 (等待完成) 
      await this.readData()
      //数据处理
      this.preproduceData()
      console.log(this.data)
      //从数据中得到作者，题材，题材的定义域
      this.getDomain() //获得三个数组
      //初始化filter
      this.initFilter() 
      //监听鼠标左键拖动
      this.mouseDrag()
      //监听shift键按下和抬起
      this.listenShift()
      //监听删除选择键
      this.listenDelete()
      //渲染初始化
      this.renderInit()
      //设置size比例尺
      this.setSizeScale()
      //绘制size比例尺
      this.makeSizeLegend()
      //设置颜色比例尺映射
      this.makeLegend()
      //渲染
      this.render()
      //初始化渲染全览
      this.initRenderOverView()
      //渲染全览
      this.renderOverView()
      //添加监听，改变视口，重新渲染 
      this.listenResize() 
      //监听滚轮
      this.listenWheel()
      //主题河流初始化
      this.initRenderThemeRiverAndLegend()
      //渲染主题河流
      this.renderThemeRiverAndLegend()
      //渲染词频统计
      this.renderWordFrequency() 
      //直方图初始化
      this.initRenderHistogram()
      //计算直方图使用的中间数据  
      this.changeDataForZhiFangTu()
      //渲染直方图
      this.renderHistogram() 
      //初始化词云
      this.initRenderCloud() 
    },
    watch: {
      size(newValue, oldValue) {
        this.render()
        this.makeSizeLegend()
      },
      borderSize(n, o) {
        this.render()
      },
      sizeMaxScale(n, o) {
        this.setSizeScale()
        this.makeSizeLegend()
        this.render()
      },
      sizeMinScale(n, o) {
        this.setSizeScale()
        this.makeSizeLegend()
        this.render()
      },
      noFocusOpacity(n, o) {
        this.render()
      },
      titleOpacity(n, o) {
        this.render()
      },
      coupletSize(n, o) {
        this.setInitLessVar() 
      }
    },
    methods: {
      listenResize() {
        window.addEventListener('resize', _.debounce(() => {
          location.reload()
        }, 500))
      },
      async readData() {
        await d3.json('./json/results.json').then(res => {
          this.data = res 
        })
      },
      setInitLessVar() {
        document.documentElement.style.setProperty('--rw', 1600/(this.coupletSize + 30))   
      }, 
      makedata() {
        let authorArr = ['鲁迅', '文心一言', '二他妈妈', '初音未来']
        let ti3cai = ['小说', '散文', '说明文']
        let ti2cai = ['农村', '爱情', '科幻']
        for (let k = 0; k < 45; ++k) {
          this.data.push({
            title: "title" + k,
            x: getrandom(0, 1000),
            y: getrandom(0, 1000),
            id: k,
            author: authorArr[getrandom(0, 3)],
            ti3cai: ti3cai[getrandom(0, 2)],
            ti2cai: ti2cai[getrandom(0, 2)],
            avgSentenceLen: getrandom(5, 18),
            totalWords: getrandom(100, 500),
            sens: getrandom(1000, 1020),
            stopWordFrequency: getrandom(10,40),
            four_wordFrequency : getrandom(1,9),
            fluency: getrandom(0.1, 0.99),
          })
        }
        this.data.forEach(d => {
          d.sentencesLen = []
          for (let k = 0; k < getrandom(10, 15); ++k) { //每篇文章10~15句话
            d.sentencesLen.push(getrandom(4, 20)) //每句话4~20词语
          }
          d.sensPerSen = []
          for(let k = 0; k < getrandom(10, 15); ++k) {
            d.sensPerSen.push(getrandom(0, 1))
          }
        })
      },
      preproduceData() {
        const titleSet = new Set();
        this.data.forEach((d, i) => {
          //状态设置未选中
          d.selected = false
          //去除title重复性
          let hasFlag = titleSet.has(d.title)
          titleSet.add(d.title)
          if (hasFlag) {
            d.title += '_' + d.id
          }
        })
        //改动数据
        // this.data[0].selected = true 
        // this.data[1].selected = true  
        // this.showAnalyseFlag = true
      },
      /***
       * 渲染初始工作
       */
      renderInit() {
        //控制小数
        this.format2f = d3.format(".2f");
        this.colorPlate = d3.interpolateSpectral
        // this.colorPlate = d3.interpolateRainbow //首尾相接可能造成错误
        // .range((d3.schemeCategory10).concat(d3.schemeBuPu))
        this.color = d3.scaleOrdinal();
        this.bottomBorder = innerHeight
        this.topBorder = 0
        this.leftBorder = 0
        this.rightBorder = innerWidth
        this.borders = [this.bottomBorder, this.topBorder, this.leftBorder, this.rightBorder]
        this.svg = d3.select('svg')
        this.svg.attr('width', innerWidth)
          .attr('height', innerHeight)
        let x_min = Math.min(...this.data.map(ele => ele.x))
        let x_max = Math.max(...this.data.map(ele => ele.x))
        let y_min = Math.min(...this.data.map(ele => ele.y))
        let y_max = Math.max(...this.data.map(ele => ele.y))
        //比例尺
        this.xScale = d3.scaleLinear().domain([x_min, x_max]);
        this.yScale = d3.scaleLinear().domain([y_min, y_max]);
        this.sizeScale = d3.scaleLinear()
        this.circles = this.svg.append('g').attr('id', 'circles') //用来存放星系图里的点
        this.titles = this.svg.append('g').attr('id', 'titles')
        //比率与缩放比
        this.ratio = 1.1
        this.scale = 1
        //渲染缩略图
        this.smallPointScale_x = d3.scaleLinear().domain([x_min, x_max])
        this.smallPointScale_y = d3.scaleLinear().domain([y_min, y_max])
        //文本卡片中的三个svg
        this.cloudSvg = d3.select('.cloud')
        this.sensSvg = d3.select('.sens')
        this.sentenceLenSvg = d3.select('.sentenceLen')
        ;[this.cloudSvg, this.sensSvg, this.sentenceLenSvg].forEach((svg) => {
          svg.attr('width', innerWidth * 0.297).attr('height', innerWidth * 0.099)
        }) 
      },
      /***
       * 渲染主视图(幂等)
       */
      render() {
        this.activeAuthor = this.authorArr.filter((d, i) => this.authorOptionState[i])
        this.activeTi2cai = this.ti2caiArr.filter((d, i) => this.ti2caiOptionState[i])
        this.activeTi3cai = this.ti3caiArr.filter((d, i) => this.ti3caiOptionState[i])
        this.innerRender(this)
      },
      innerRender: _.throttle((that) => {
        //每次渲染都设置比例尺值域
        that.xScale.range([that.leftBorder, that.rightBorder])
        that.yScale.range([that.topBorder, that.bottomBorder])
        //渲染点
        that.circles.selectAll('.point').data(that.data).join('circle')
          .attr('class', 'point')
          .attr('r', d => Math.pow(that.size * that.scale, 0.3) * (that.sizeCondition == 'no' ? 1 : that.sizeScale(d[that.sizeCondition])))
          .attr('cx', d => that.xScale(d.x))
          .attr('cy', d => that.yScale(d.y))
          .attr('fill', d => that.colorCondition == 'no' ? 'white' : that.color(d[that.colorCondition]))
          .attr('opacity', d => {
            if (
              that.activeAuthor.includes(d.author) &&
              that.activeTi2cai.includes(d.ti2cai) &&
              that.activeTi3cai.includes(d.ti3cai)
            ) {
              return that.focusOpacity
            }
            return that.noFocusOpacity
          })
          .attr('stroke-width', Math.pow(that.borderSize, 0.3))
          .each(function (d, i, g) {
            if (d.selected) {
              repeat(this)
            }
          })
          .attr('stroke', d => d.selected ? 'red' : 'transparent')
        //定义循环闪烁过渡
        function repeat(thatPoint) {
          let transition = d3.transition().ease(d3.easeCubic).duration(100);
          d3.select(thatPoint)
            // .attr('stroke', d3.interpolateRainbow(Math.random())) //随机颜色
            .transition(transition)
            .attr('stroke', 'yellow')
            .transition() //继承
            .attr('stroke', 'red')
            .on('end', (d) => {
              if (d.selected)
                repeat(thatPoint)
              else {
                d3.select(thatPoint).attr('stroke', 'transparent')
              }
            })
          //.on('end', repeat(thatPoint)) 返回值不是函数，语法错误
        }
        //渲染title 
        if(that.titleColor == 'transparent') { 
          that.titles.selectAll('.title').remove()
        }
        else {
          that.titles.selectAll('.title').data(that.data).join('text')
            .attr('class', 'title')
            .attr('fill', d => {
              if (that.titleColor == 'follow')
                return that.colorCondition == 'no' ? 'white' : that.color(d[that.colorCondition])
              return that.titleColor
            })
            .attr('font-size', 0)
            .text(d => d.title)
            .attr('transform', d => `translate(${that.xScale(d.x)}, ${that.yScale(d.y)})`)
            .attr('dx', d => Math.pow(that.size * that.scale, 0.3) * (that.sizeCondition == 'no' ? 1 : that.sizeScale(d[that.sizeCondition])) * 2)
            .attr('dy', 5)
            .attr('opacity', that.titleOpacity)
        }
        //对每个点添加鼠标事件监听
        that.addMouseEventListener()
      }, this.throttle),

      addMouseEventListener() {
        this.circles.selectAll('.point')
          .on('click', (e, d) => {
            d.selected = !d.selected
            this.changeDataForZhiFangTu()
            this.renderHistogram()
            this.render()
            this.renderOverView()
            this.renderThemeRiverAndLegend()
            this.renderWordFrequency()
            this.updateShowAnalyseFlag() 
          }).on('mouseover', (e, d) => {
            //判断象限
            let leftHalfFlag = e.clientX < this.innerWidth / 2
            let topHalfFlag = e.clientY < this.innerHeight / 2
            //把框显示并挪过来
            this.cardDisplayFlag = true   //为了增加淡入淡出效果，启用此方法
            let card = document.querySelector('.card')
            setTimeout(() => {
              card.style['top'] = (topHalfFlag ? e.offsetY * 1.03 : (e.offsetY - card.offsetHeight) * 0.98) + 'px'
              card.style['left'] = (leftHalfFlag ? e.offsetX * 1.03 : (e.offsetX - card.offsetWidth) * 0.98) + 'px'
              //更新卡片信息
              document.querySelector('.card .textTitle').innerHTML = "《" + d.title + "》"
              document.querySelector('.card .textAuthor span').innerHTML = d.author
              document.querySelector('.card .textTi2cai span').innerHTML = d.ti2cai
              document.querySelector('.card .textTi3cai span').innerHTML = d.ti3cai
              //绘制词云
              this.renderCloud(d)  
            }, 0)  
          }).on('mouseout', (e, d) => {
            this.cardDisplayFlag = false
          })
      },
 
      /**
       * 监听滚轮，实现可以挪动和缩放视图
       */
      listenWheel() {
        this.svg.on('wheel', _.throttle((e, d) => {
          e.preventDefault()
          // console.log(e.offsetX)
          // console.log(e.offsetY)
          let ratio
          if (e.deltaY < 0) {
            ratio = this.ratio
          }
          else {
            ratio = 1 / this.ratio
          }
          this.scale *= ratio
          this.rightBorder *= ratio
          this.leftBorder *= ratio
          this.topBorder *= ratio
          this.bottomBorder *= ratio
          let dx, dy
          if (e.deltaY < 0) {
            //放大
            dx = this.rightBorder * this.ratio - (e.offsetX + (this.rightBorder - e.offsetX) * this.ratio)
            dy = this.bottomBorder * this.ratio - (e.offsetY + (this.bottomBorder - e.offsetY) * this.ratio)
            dx *= -1
            dy *= -1
          }
          else {
            //缩小
            dx = e.offsetX + (this.rightBorder - e.offsetX) * ratio - this.rightBorder * ratio
            dy = e.offsetY + (this.bottomBorder - e.offsetY) * ratio - this.bottomBorder * ratio
          }
          this.leftBorder += dx
          this.rightBorder += dx
          this.topBorder += dy
          this.bottomBorder += dy
          this.render()
          // 改变size图例
          this.makeSizeLegend()
          this.renderOverView()
        },))// 可以设置节流
      },
      switchColorButton(index) {
        this.colorOptionState = [false, false, false, false]
        this.colorOptionState[index] = true
        this.colorCondition = this.colorOptionStr[index]
        this.makeLegend()
        this.render()
      },
      switchSizeButton(index) {
        this.sizeOptionState = [false, false, false, false]
        this.sizeOptionState[index] = true
        this.sizeCondition = this.sizeOptionStr[index]
        // this.makeLegend()
        //重新设置size比例尺
        this.setSizeScale()
        this.makeSizeLegend()
        this.render()
      },
      setSizeScale() {
        //根据sizeCondition设置定义域
        // avgSentanceLen
        this.minNumInSize = this.handleSizeNum(d3.min(this.data.map(d => d[this.sizeCondition])))
        this.maxNumInSize = this.handleSizeNum(d3.max(this.data.map(d => d[this.sizeCondition])))
        this.sizeScale.domain([this.minNumInSize, this.maxNumInSize]).range([this.sizeMinScale, this.sizeMaxScale])

      },
      handleSizeNum(num) { //可能使用根号或者log
        return num
      },
      getDomain() {
        this.authorArr = Array.from(new Set(this.data.map(d => d.author))).sort()
        this.ti2caiArr = Array.from(new Set(this.data.map(d => d.ti2cai))).sort()
        this.ti3caiArr = Array.from(new Set(this.data.map(d => d.ti3cai))).sort()
      },
      makeLegend() {
        //颜色图例 
        switch (this.colorCondition) {
          case 'author':
            this.colorLegendTxtArr = this.authorArr
            break
          case 'ti2cai':
            this.colorLegendTxtArr = this.ti2caiArr
            break
          case 'ti3cai':
            this.colorLegendTxtArr = this.ti3caiArr
            break
          case 'no':
            this.colorLegendTxtArr = []
            break
          default:
            throw new Error('不存在的condition类型')
        }
        const sp = d3.scalePoint().domain(this.colorLegendTxtArr) //映射到[0,1]
        this.color.domain(this.colorLegendTxtArr).range(this.colorLegendTxtArr.map(d => this.colorPlate(sp(d)))); //该比例尺将platform映射到具体颜色 
        this.colorLegendColorArr = []
        for (let k of this.colorLegendTxtArr) {
          this.colorLegendColorArr.push(this.color(k))
        }

      },
      mouseDrag(e) {
        if (!this.mouseDownFlag)
          return
        if (this.shiftPressedFlag == true) {
          let now_x = e.offsetX
          let now_y = e.offsetY
          let x = Math.min(this.start_x, now_x)
          let y = Math.min(this.start_y, now_y)
          let width = Math.abs(this.start_x - now_x)
          let height = Math.abs(this.start_y - now_y)
          let selectRect = this.svg.selectAll('.selectedRect').data([null]).join('rect')
            .attr('class', 'selectedRect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', width)
            .attr('height', height)
            .attr('stroke', 'yellow')
            .attr('stroke-width', 1)
            .style('fill', 'rgb(255, 220, 0, 0.3)')
            .attr('opacity', 1)
        } else {
          this.leftBorder += e.movementX
          this.rightBorder += e.movementX
          this.topBorder += e.movementY
          this.bottomBorder += e.movementY
          this.render()
          this.renderOverView()
        }
      },
      makeSizeLegend() {
        this.sizeLegendPointArr = []
        this.sizeLegendTxtArr = []
        if (this.sizeCondition == 'no')
          return
        const len = this.sizeLegendLen
        span = (this.maxNumInSize - this.minNumInSize) / (len - 1)
        for (let k = 0; k < len; ++k) {
          this.sizeLegendTxtArr.push(+this.format2f(this.minNumInSize + span * (k + 1)))
        }
        //获取真实半径（px） 影响因子：当前主视图缩放比例，基础大小，大小表示的内容
        for (let k of this.sizeLegendTxtArr) {
          this.sizeLegendPointArr.push(Math.pow(this.size * this.scale, 0.3) * (this.sizeCondition == 'no' ? 1 : this.sizeScale(k)))
        }
      },
      initFilter() {
        this.authorOptionState = Array.from(this.authorArr, d => true)
        this.ti2caiOptionState = Array.from(this.ti2caiArr, d => true)
        this.ti3caiOptionState = Array.from(this.ti3caiArr, d => true)
      },
      switchAuthorButton(index) {
        this.authorOptionState = Array.from(this.authorOptionState) //通过浅拷贝改变指针，否则vue无法察觉该数组的变化
        this.authorOptionState[index] = !this.authorOptionState[index]
        this.render()
      },
      switchTi2caiButton(index) {
        this.ti2caiOptionState = Array.from(this.ti2caiOptionState) //通过浅拷贝改变指针，否则vue无法察觉该数组的变化
        this.ti2caiOptionState[index] = !this.ti2caiOptionState[index]
        this.render()
      },
      switchTi3caiButton(index) {
        this.ti3caiOptionState = Array.from(this.ti3caiOptionState) //通过浅拷贝改变指针，否则vue无法察觉该数组的变化
        this.ti3caiOptionState[index] = !this.ti3caiOptionState[index]
        this.render()
      },
      initRenderOverView() {
        const overview = document.querySelector('.innerOverview')
        //全览最大宽高
        this.boundaryWidthMax = overview.clientWidth
        this.boundaryHeightMax = overview.clientHeight
        //设置overviewSvg
        this.overviewSvg = d3.select('.overview').select('svg')
          .attr('width', this.boundaryWidthMax)
          .attr('height', this.boundaryHeightMax)
        //定义两个轴上的比例尺
        this.overviewScale_x = d3.scaleLinear()
        this.overviewScale_y = d3.scaleLinear()
        //创建两个矩形
        this.overviewSvg.append('rect').attrs({
          class: 'pointsRect',
          opacity: 0.9
        })
        this.overviewSvg.append('rect').attrs({
          class: 'screenRect',
          stroke: 'yellow',
          'stroke-width': 3,
          fill: 'transparent'
        })


      },
      renderOverView() {
        //计算bigRect的四个边的实际坐标
        let leftMin = Math.min(this.leftBorder, 0)
        let rightMax = Math.max(this.rightBorder, innerWidth)
        let topMin = Math.min(this.topBorder, 0)
        let bottomMax = Math.max(this.bottomBorder, innerHeight)
        //计算三个矩形关键参数(未经比例尺映射)
        this.bigRect = {
          left: leftMin,
          top: topMin,
          right: rightMax,
          bottom: bottomMax,
          width: rightMax - leftMin,
          height: bottomMax - topMin
        }
        this.pointsRect = {
          left: this.leftBorder,
          top: this.topBorder,
          right: this.rightBorder,
          bottom: this.bottomBorder
          // height: 100 
        }
        this.screenRect = {
          left: 0,
          top: 0,
          right: this.innerWidth,
          bottom: this.innerHeight
        }
        //计算合适的比率，进而求出缩略图的宽高
        let boundaryRatio = 1 / Math.max(this.bigRect.width / this.boundaryWidthMax, this.bigRect.height / this.boundaryHeightMax)
        let boundaryWidth = this.bigRect.width * boundaryRatio
        let boundaryHeight = this.bigRect.height * boundaryRatio
        //设置比例尺，映射x,y两个方向
        this.overviewScale_x.domain([leftMin, rightMax]).range([0, boundaryWidth])
        this.overviewScale_y.domain([topMin, bottomMax]).range([0, boundaryHeight])
        d3.select('.pointsRect').datum(this.pointsRect)
          .attr('x', d => this.overviewScale_x(d.left))
          .attr('y', d => this.overviewScale_y(d.top))
          .attr('width', d => this.overviewScale_x(d.right) - this.overviewScale_x(d.left))
          .attr('height', d => this.overviewScale_y(d.bottom) - this.overviewScale_y(d.top))
        d3.select('.screenRect').datum(this.screenRect)
          .attr('x', d => this.overviewScale_x(d.left))
          .attr('y', d => this.overviewScale_y(d.top))
          .attr('width', d => this.overviewScale_x(d.right) - this.overviewScale_x(d.left))
          .attr('height', d => this.overviewScale_y(d.bottom) - this.overviewScale_y(d.top))
        this.renderPointsInOverView()
      },
      renderPointsInOverView() {
        this.smallPointScale_x.range([this.pointsRect.left, this.pointsRect.right].map(d => this.overviewScale_x(d)))
        this.smallPointScale_y.range([this.pointsRect.top, this.pointsRect.bottom].map(d => this.overviewScale_y(d)))
        this.overviewSvg.selectAll('.smallPointInOverview').data(this.data).join('circle')
          .attr('class', 'smallPointInOverview')
          .attr('r', d => d.selected ? 1.2 : 1) 
          .attr('cx', d => this.smallPointScale_x(d.x))
          .attr('cy', d => this.smallPointScale_y(d.y))
          .attr('fill', d => d.selected ? 'red' : 'white')
      },
      listenShift() {
        document.addEventListener('keydown', (e) => { //注意，给整个document添加键盘监听，就不需要有input的条件
          if (e.key == 'Shift') {
            this.shiftPressedFlag = true  //注意这里使用this时候不要用普通函数
          }
        })
        document.addEventListener('keyup', (e) => {
          if (e.key == 'Shift') {
            this.shiftPressedFlag = false
          }
        })
      },
      listenDelete() { 
        document.addEventListener('keydown', (e) => { //注意，给整个document添加键盘监听，就不需要有input的条件
          if (e.key == 'Delete') { 
            document.querySelector('.deleteAll').click() 
          }
        })
      },
      mouseDown(e) {
        this.start_x = e.offsetX
        this.start_y = e.offsetY
        this.mouseDownFlag = true
      },
      mouseUp(e) {
        this.end_x = e.offsetX
        this.end_y = e.offsetY
        this.svg.select('.selectedRect').attr('opacity', 0).attr('width', 0).attr('height', 0)
        this.mouseDownFlag = false
        if (this.shiftPressedFlag) {
          this.doSelect()
        }
      },
      doSelect() {
        this.data.filter((d, i) => {
          let x = this.xScale(d.x)
          let y = this.yScale(d.y)
          return (
            x > Math.min(this.end_x, this.start_x) &&
            x < Math.max(this.end_x, this.start_x) &&
            y < Math.max(this.end_y, this.start_y) &&
            y > Math.min(this.end_y, this.start_y)
          )
        }).forEach((d, i) => {
          d.selected = !d.selected
        })
        this.changeDataForZhiFangTu() 
        this.renderHistogram()
        this.render()
        this.renderOverView()
        this.renderThemeRiverAndLegend()
        this.renderWordFrequency()
        this.updateShowAnalyseFlag() 
      },
      selectFocused(target) {
        this.data.forEach(d => {
          if (
            this.activeAuthor.includes(d.author) &&
            this.activeTi2cai.includes(d.ti2cai) &&
            this.activeTi3cai.includes(d.ti3cai)
          ) {
            d.selected = target
          }
        })
        this.changeDataForZhiFangTu()
        this.renderHistogram()
        this.render()
        this.renderOverView()
        this.renderThemeRiverAndLegend()
        this.renderWordFrequency()
        this.updateShowAnalyseFlag() 
      },
      selectall(target) {
        this.data.forEach(d => {
          d.selected = target
        })
        this.changeDataForZhiFangTu() 
        this.renderHistogram()
        this.render()
        this.renderOverView()
        this.renderThemeRiverAndLegend()
        this.renderWordFrequency()
        this.updateShowAnalyseFlag() 
      },
      clickOverview() {
        this.displayTitle2 = !this.displayTitle2
        this.renderOverView()
      },
      switchTitleColor(colorStr) {
         console.log(colorStr)
        this.titleColor = colorStr
        this.render()
      },
      changeDataForZhiFangTu() {
        //清空重做
        this.dataForZhiFangTu = [] 
        //过滤data得到selectedData
        let selectedData = this.data.filter(d => d.selected)
        //获取所有作者
        let selectedAuthors = new Set(Array.from(selectedData.map(d => d.author))) 
        //对每个作者，制作一个对象放入dataForZhiFangTu中
        console.log('作者')
        console.log(selectedAuthors)
        for(let k of selectedAuthors) {
          let newItem = {'author' : k}
          //从已选择数据点中获取是当前作者的数据
          let selectedDataOfThisAuthor = selectedData.filter(d => d.author == k)
          newItem['avgSentenceLen'] = selectedDataOfThisAuthor.map(d => d.avgSentenceLen).reduce((b, e) => b + e) / selectedDataOfThisAuthor.length
          newItem['avgSens'] = selectedDataOfThisAuthor.map(d => d.sens).reduce((b, e) => b + e) / selectedDataOfThisAuthor.length
          newItem['stopWordFrequency'] = selectedDataOfThisAuthor.map(d => d.stopWordFrequency).reduce((b, e) => b + e) / selectedDataOfThisAuthor.length
          newItem['four_wordFrequency'] = selectedDataOfThisAuthor.map(d => d.four_wordFrequency).reduce((b, e) => b + e) / selectedDataOfThisAuthor.length
          newItem['perplexities'] = selectedDataOfThisAuthor.map(d => d.perplexities).reduce((b, e) => b + e) / selectedDataOfThisAuthor.length
          this.dataForZhiFangTu.push(newItem) 
        }
        console.log('直方图数据如下')
        console.log(this.dataForZhiFangTu)
      },
      changeCoupleSize(deltaSize) {
        this.coupletSize += deltaSize
        localStorage.setItem('coupletSize', this.coupletSize)
        location.reload() 
      },
      //渲染主题河流和图例的初始化
      gl(param) { //getLenForRiver
        return this.baseWidth * param / 100
      },
      initRenderThemeRiverAndLegend() { 
        this.baseWidth = document.querySelector('.base').offsetWidth //宽度基准元素 
        // 定义svg 设置大小  
        this.svgRiver = d3.select('.themeRiver')
        .attr('width', this.gl(96.5))
        .attr('height', this.gl(70))  
        console.log(1) 
        // 留边
        this.margin = { top: this.gl(1), bottom: this.gl(6), left: this.gl(7), right: this.gl(3) }; 
        this.innerWidthForRiver = this.svgRiver.attr('width') - this.margin.left - this.margin.right
        this.innerHeightForRiver = this.svgRiver.attr('height') - this.margin.top - this.margin.bottom
        //定义颜色比例尺的色盘
        this.colorScaleForRiver = d3.scaleOrdinal(d3.schemeSet1.concat(d3.schemeSet2).concat(d3.schemeSet3)) 
        //比例尺
        this.xScaleForRiver = d3.scaleLinear().domain([0, 100]).range([0, this.innerWidthForRiver]).nice()
        this.yScaleForRiver = d3.scaleLinear().range([0, this.innerHeightForRiver].reverse()).nice()
        //maingroup留边
        this.mainGroupForRiver = this.svgRiver.append('g')
          .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`) 
        //坐标轴元素
        this.yAxisGroup = this.mainGroupForRiver.append('g').attr('id', 'yaxisRiver')
        this.xAxisGroup = this.mainGroupForRiver.append('g').attr('id', 'xaxisRiver')
          .attr('transform', `translate(0, ${this.innerHeightForRiver})`)  
      },
      //幂等地渲染主题河流和图例
      renderThemeRiverAndLegend() {
        this.beforeThemeRenderThemeAndLegend()
        this.renderThemeRiver()
        this.renderLegend() 
      },
      //每次渲染两者时的准备工作
      beforeThemeRenderThemeAndLegend() {
        //更新keys,更新颜色的映射
        this.keysForRiver = this.data.filter(d => d.selected).map(d => d.title).sort()
        this.colorScaleForRiver.domain(this.keysForRiver) 
      },
      //渲染主题河流
      renderThemeRiver(textObj) {
        const stack = d3.stack().keys(this.keysForRiver)
        const stackData = []
        //获取x轴的刻度
        let xTickArr = [] 
        let span = 100 / (this.tickNum - 1)
        let startNum = 0
        for (let k = 0; k < this.tickNum - 1; ++k) { 
          xTickArr.push(startNum)
          startNum += span 
        }
        xTickArr.push(100) //结尾是固定的100% 
        console.log(xTickArr) 
        //制作stackData
        xTickArr.forEach(p => { 
          let newItem = { 'progress': p }
          this.keysForRiver.forEach(k => { //对每篇文章都找到当前进度(progress)下的对应变量的值
            let sentencesLenForThisK = this.data.find(d => d.title == k)[this.currentAttrForRiver] 
            let arrLen = sentencesLenForThisK.length
            newItem[k] = sentencesLenForThisK[Math.floor((arrLen - 1) * (p / 100))] 
          })
          stackData.push(newItem)
        })
        //堆叠
        const stackedData = stack(stackData); 
        //定义过渡
        let transition = d3.transition().duration(400).ease(d3.easeLinear)
        //完善y轴比例尺
        this.yScaleForRiver.domain([0, 1.1 * d3.max(stackedData, item1 => d3.max(item1, item2 => item2[1]))])
        //轴函数
        let yAxis = d3.axisLeft(this.yScaleForRiver).tickSize(-1 * this.innerWidthForRiver).ticks(5)
        let xAxis = d3.axisBottom(this.xScaleForRiver).tickSize(-1 * this.innerHeightForRiver).ticks(4) 
        //绘制坐标轴
        this.yAxisGroup.transition(transition).call(yAxis)
        this.xAxisGroup.transition(transition).call(xAxis)   
        //调整坐标轴上的字 
        this.yAxisGroup.selectAll('.tick text').style('font-size', this.gl(4))
        this.xAxisGroup.selectAll('.tick text').style('font-size', this.gl(4)).text(d => d + "%")
        let yTickTextArr = document.querySelectorAll('#yaxisRiver .tick text')
        let xTickTextArr = document.querySelectorAll('#xaxisRiver .tick text')
        d3.select(yTickTextArr[yTickTextArr.length-1]).attr('dy', this.gl(3))
        d3.select(xTickTextArr[xTickTextArr.length-1]).attr('dx', this.gl(-5))
        d3.select(xTickTextArr[0]).attr('dx', this.gl(3))
        //定义area
        let area = d3.area() //d.data是指向stackData中相应元素的指针
          .x(d => this.xScaleForRiver(d.data.progress))   
          .y1(d => this.yScaleForRiver(d[1])) 
          .y0(d => this.yScaleForRiver(d[0]))  
          .curve(d3.curveCardinal.tension(-0.1));    
        //绘制图形 data-join 
        this.mainGroupForRiver.selectAll('.riverPath').data(stackedData, d => d.key).join('path')
          .transition(transition)
          .attr('class', 'riverPath')
          .attr('d', area)
          .attr('fill', d => this.colorScaleForRiver(d.key))
          .attr('opacity', 0.9) 
        this.mainGroupForRiver.selectAll('.riverPath').on('mouseover', (e,d)=>{
          console.log(e)  
        })
      },
      renderLegend() {
        //更新两个数组 
        this.colorLegendColorArrForRiver = []
        this.colorLegendTxtArrForRiver = []
        this.keysForRiver.forEach(k => {
          this.colorLegendColorArrForRiver.unshift(this.colorScaleForRiver(k))
          this.colorLegendTxtArrForRiver.unshift(k) 
        })

      },
      changeAttrForRiver(attr) {
        this.currentAttrForRiver = attr
        this.renderThemeRiverAndLegend()
      },
      renderWordFrequency() {
        let map = new Map()
        let wordArr = Object.keys(this.data[0].words)
        this.data.filter(d => d.selected).map(d => d.words).forEach(d => {
          wordArr.forEach(k => {
            if(d[k] == 0)
              return 
            if(!map.get(k)) {
              map.set(k, 1)
            } else {
              map.set(k, map.get(k) + 1) 
            }
          })
        })
        this.wordFrequencyArr = Array.from(map).sort((b, a) => a[1] - b[1]) 
        console.log(this.wordFrequencyArr)
      },
      clickWordItem(word) {
        this.data.forEach(d => {
          d.selected = d.words[word] != 0   
        })
        this.changeDataForZhiFangTu() 
        this.render()
        this.renderThemeRiverAndLegend()
        this.renderWordFrequency() 
        this.renderOverView() 
        this.renderHistogram() 
      },
      updateShowAnalyseFlag() {
        this.showAnalyseFlag = this.data.filter(d => d.selected).length != 0 
      },
      //绘制直方图的初始化函数（系统刚打开时调用一次）
      initRenderHistogram() {
        this.svgHistogram = d3.select('.histogram')
          .attr('width', this.gl(96.5))
          .attr('height', this.gl(70))   
        // 留边
        this.marginForHistogram = { top: this.gl(1), bottom: this.gl(9), left: this.gl(8), right: this.gl(3) };  
        this.innerWidthForHistogram = this.svgHistogram.attr('width') - this.marginForHistogram.left - this.marginForHistogram.right
        this.innerHeightForHistogram = this.svgHistogram.attr('height') - this.marginForHistogram.top - this.marginForHistogram.bottom
        //定义颜色比例尺的色盘
        this.colorScaleForHistogram = d3.scaleOrdinal(d3.schemeSet1.concat(d3.schemeSet2).concat(d3.schemeSet3)) 
        //比例尺
        this.xScaleForHistogram = d3.scaleBand().range([0, this.innerWidthForHistogram]).padding(0.3) 
        this.yScaleForHistogram = d3.scaleLinear().range([0, this.innerHeightForHistogram]) 
        //maingroup留边
        this.mainGroupForHistogram = this.svgHistogram.append('g')
          .attr('transform', `translate(${this.marginForHistogram.left}, ${this.marginForHistogram.top})`) 
        //坐标轴元素
        this.yAxisGroupForHistogram = this.mainGroupForHistogram.append('g').attr('id', 'yaxisHistogram')
        this.xAxisGroupForHistogram = this.mainGroupForHistogram.append('g').attr('id', 'xaxisHistogram')
          .attr('transform', `translate(0, ${this.innerHeightForHistogram})`)  
        //取值函数
        this.getXValue = d => d['author']
        this.getYValue = d => d[this.currentAttrForHistogram]   
        //坐标轴函数
        this.xAxisForHistogram = d3.axisBottom(this.xScaleForHistogram)
        this.yAxisForHistogram = d3.axisLeft(this.yScaleForHistogram).ticks(4)
        //定义过渡
        this.durationTimeForHistogram = 1000
      },
      //幂等地渲染直方图
      renderHistogram() { 
        console.log('渲染直方图')
        this.getYValue = d => d[this.currentAttrForHistogram]   
        console.log(this.dataForZhiFangTu)  
        //设置比例尺
        this.xScaleForHistogram.domain(this.dataForZhiFangTu.map(this.getXValue).sort())
        this.yScaleForHistogram.domain([0, d3.max(this.dataForZhiFangTu.map(this.getYValue))].reverse())   
        //绘制坐标轴
        this.xAxisGroupForHistogram.transition(this.durationTimeForHistogram).call(this.xAxisForHistogram) 
        this.yAxisGroupForHistogram.transition(this.durationTimeForHistogram).call(this.yAxisForHistogram) 
        //调节刻度字号
        this.yAxisGroupForHistogram.selectAll('.tick text').style('font-size', this.gl(4))
        this.xAxisGroupForHistogram.selectAll('.tick text').style('font-size', this.gl(4))
        //获取三个部分
        let update = this.mainGroupForHistogram.selectAll('rect').data(this.dataForZhiFangTu, this.getXValue)
        let enter = update.enter().append('rect')
        let exit = update.exit()
        //定义删除exit的动作
        exit
          .attr('fill', 'orange')
          .transition()
          .duration(this.durationTimeForHistogram)
          .attr('height', 0)
          .attr('y', this.innerHeightForHistogram)
          .remove()  //删除后下次作为enter添加否则是update
        //定义enter部分的初始状态
        enter
          .attr('hight', 0)
          .attr('width', this.xScaleForHistogram.bandwidth())
          .attr('x', d => this.xScaleForHistogram(this.getXValue(d)))
          .attr('y', this.innerHeightForHistogram)
        //合并，调整join的部分
        let join = enter.merge(update)
        console.log('JOIN') 
        join.transition().duration(this.durationTimeForHistogram)
          .attr('width', this.xScaleForHistogram.bandwidth())
          .attr('x', d => this.xScaleForHistogram(this.getXValue(d)))
          .attr('height', d => this.innerHeightForHistogram - this.yScaleForHistogram(this.getYValue(d)))    
          .attr('y', d => this.innerHeightForHistogram - (this.innerHeightForHistogram - this.yScaleForHistogram(this.getYValue(d))))      
          .attr('fill', 'url(#grad)') 
      },
      switchAttrForHistogram(attr) {
        this.currentAttrForHistogram = attr
        console.log(this.dataForZhiFangTu)
        this.renderHistogram() 
      },
      initRenderCloud() {
        this.widthForCloud = this.gl(100); 
        this.heightForCloud = this.gl(60); 
        this.layoutForCloud = d3.layout.cloud();
        this.mainsvgForCloud = d3.select(".cloud").attr('width', this.widthForCloud).attr('height', this.heightForCloud) 
        this.maingroupForCloud = this.mainsvgForCloud.append("g"); 
        renderFunction(this);
        function draw(that, wordsUsed){
          d3.selectAll('.cloudText').remove() 
          that.maingroupForCloud.attr("transform", "translate(" + that.layoutForCloud.size()[0] / 2 + "," + that.layoutForCloud.size()[1] / 2 + ")") 
            .selectAll("text")
            .data(wordsUsed)
            .enter().append("text")
            .attr('class', 'cloudText') 
            .attr('font-weight', 900)
            .style("fill", "#28506E") 
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
            .text(d => d.text)
            .style('font-size', d => that.gl(d.size * 0.4)) 
            .each((d) => {
              console.log(d.size * 100)
            })
        }
        function renderFunction(that){
          that.layoutForCloud.size([that.widthForCloud, that.heightForCloud])  
            .padding(that.gl(1))
            .rotate(0)
            .font("Impact")
            .fontSize(d => Math.pow(d.size,0.25) * that.gl(10))     
            .on("end", function(words){
              draw(that, words); 
            });
        }
      },
      renderCloud(d) {
        let data = {}
        Object.keys(d.words).forEach(k => {
          if(d.words[k]!=0)   
            data[k] = d.words[k] 
        })
        const words = Object.entries(data).map(([text, size]) => ({text, size: size * 1}));
        function showFunction(that ,wordsUsed){
          that.layoutForCloud.words(wordsUsed).start(); 
        }
        showFunction(this, words);  
      
      }
    }
  }
)
}()