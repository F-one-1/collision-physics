const canvas = document.getElementById("gameboard");
const ctx = canvas.getContext("2d");
// ctx 为2d画布作图环境

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var demo = [[-1,-1],[-1,-1]]
let width = canvas.width;
let height = canvas.height;

// 因为重力加速度的单位是 m/s/s，而画布以像素为单位，所以重力加速度应保持一定的比例，
// 这里简单的使用了 100 倍的重力加速度。
const gravity = 980;

/**
 * 向量操作工具类
 */
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * 向量加法
   * @param {Vector} v
   * @returns
   */
  add(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  /**
   * 向量减法
   * @param {Vector} v
   * @returns
   */
  substract(v) {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  /**
   * 向量与标量乘法
   * @param {Vector} s
   * @returns
   */
  multiply(s) {
    return new Vector(this.x * s, this.y * s);
  }

  /**
   * 向量与向量点乘（投影）
   * @param {Vector} v
   * @returns
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * 向量标准化（除去长度）
   * @returns 标准化后的向量
   */
  normalize() {
    let distance = Math.sqrt(this.x * this.x + this.y * this.y);
    return new Vector(this.x / distance, this.y / distance);
  }
}
// context 为ctx , ctx 为运行环境包含大量API
class Circle {
  constructor(context, x, y, r, vx, vy, mass = 1, cor = 1) {
    this.context = context;
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = vx;
    this.vy = vy;
    this.mass = mass;
    this.cor = cor;

    this.colliding = false;
  }

  // 绘制小球
  draw() {
    this.context.fillStyle = this.colliding
      ? "hsl(300, 100%, 70%)"
      : "hsl(170, 100%, 50%)";
    this.context.beginPath();
    // 新建一条路径。一旦创建成功，图形绘制命令
    // 在指定路径上生成路径
    this.context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    // 绘制圆弧
    this.context.fill();
    // 填充内容区域生成实心的图形
  }

  /**
   * 检查是否与其它小球碰撞
   * @param {Circle} other
   */
  checkCollideWith(other) {
    if (this.isCircleCollided(other)) {
      this.colliding = true;
      other.colliding = true;
      this.changeVelocityAndDirection(other);
    }
  }

  /**
   * 如果距离小于两球半径之和，则发生了碰撞
   * @param {Circle} other
   * @returns
   */
  isCircleCollided(other) {
    let squareDistance =
      (this.x - other.x) * (this.x - other.x) +
      (this.y - other.y) * (this.y - other.y);
    let squareRadius = (this.r + other.r) * (this.r + other.r);
    return squareDistance <= squareRadius;
  }

  /**
   * 改变碰撞后的速度和方向。当两球碰撞时，其实只有连心线方向上的速度发生了变化
   * 切线方向上的不变，这样 2 维碰撞实际上就转换成了 1 维碰撞问题。
   * @param {Circle} other
   */
  changeVelocityAndDirection(other) {
    // 创建两小球的速度向量
    let velocity1 = new Vector(this.vx, this.vy);
    let velocity2 = new Vector(other.vx, other.vy);

    // 获取连心线方向上的向量
    let vNorm = new Vector(this.x - other.x, this.y - other.y);

    // 标准化连心线方向上的向量，并根据它获取切线方向上的向量
    let unitVNorm = vNorm.normalize();
    let unitVTan = new Vector(-unitVNorm.y, unitVNorm.x);

    // 获取速度向量在连心线和切线方向上的投影
    let v1n = velocity1.dot(unitVNorm);
    let v1t = velocity1.dot(unitVTan); // 切线方向速度不变

    let v2n = velocity2.dot(unitVNorm);
    let v2t = velocity2.dot(unitVTan); // 切线方向速度不变

    // 恢复系数，取最小值
    let cor = Math.min(this.cor, other.cor);

    // 碰撞后，1 球连心线方向上的速度标量，如果质量相同，则与 2 球速度互换。
    // let v1nAfter =
    //   (v1n * (this.mass - other.mass) + 2 * other.mass * v2n) / (this.mass + other.mass);
    let v1nAfter =
      (this.mass * v1n + other.mass * v2n + cor * other.mass * (v2n - v1n)) /
      (this.mass + other.mass);

    // 碰撞后，2 球连心线方向上的速度标量，如果质量相同，则与 2 球速度互换。
    // let v2nAfter =
    //   (v2n * (other.mass - this.mass) + 2 * this.mass * v1n) / (this.mass + other.mass);
    let v2nAfter =
      (this.mass * v1n + other.mass * v2n + cor * this.mass * (v1n - v2n)) /
      (this.mass + other.mass);

    // 1 球速度小于 2 球速度，两球自行离开
    if (v1nAfter < v2nAfter) {
      return;
    }

    // 获取两球在连心线和切线方向上的速度向量
    let v1VectorNorm = unitVNorm.multiply(v1nAfter);
    let v1VectorTan = unitVTan.multiply(v1t);

    let v2VectorNorm = unitVNorm.multiply(v2nAfter);
    let v2VectorTan = unitVTan.multiply(v2t);

    // 计算碰撞后的速度向量
    let velocity1After = v1VectorNorm.add(v1VectorTan);
    let velocity2After = v2VectorNorm.add(v2VectorTan);

    this.vx = velocity1After.x;
    this.vy = velocity1After.y;

    other.vx = velocity2After.x;
    other.vy = velocity2After.y;
  }

  /**
   * 更新画布
   * @param {number} seconds
   */
  update(seconds) {
    this.vy += gravity * seconds; // 重力加速度
    this.x += this.vx * seconds;
    this.y += this.vy * seconds;
  }
}

class Gameboard {
  constructor() {
    this.startTime;
    this.init();
  }

  // 初始化画布
  init() {
    // document.querySelector('main').addEventListener('click', function (event) {
    //   var e = event || window.event;
    //   console.log({'x':e.clientX,'y':e.clientY})
    //   this.circles.push(new Circle(ctx, e.clientX, e.clientY, 30, 0, 0, 30, 0.6))
    //   // return {'x':e.clientX,'y':clientY}
    // },false)
    this.circles = [
      // new Circle(ctx, 30, 50, 30, -100, 390, 30, 0.6),
      // new Circle(ctx, 60, 180, 20, 180, -275, 20, 0.5),
      // new Circle(ctx, 120, 100, 60, 120, 262, 100, 0.3),
    ];
    let main1 = document.getElementsByTagName('main');
    main1[0].onclick = (e) => {
      let vx = 0
      let vy = 0
      if(demo[0][0]!==-1 && demo[0][1]!==-1 && demo[1][0]!==-1 && demo[1][1]!==-1){
        vx = (demo[1][0] - demo[0][0])*231
        vy = (demo[1][1] - demo[0][1])*231
      }
      else{
        vx = 0
        vy = 0
      }
      console.log(demo,demo[0][0],demo[0][1],vx,vy)
      this.circles.push(new Circle(ctx, e.clientX, e.clientY, 30, vx, vy, 30, 0.6))
      console.log(e.clientX, e.clientY)
    }
    
    var myVar;
    setInterval(myFunction(),50); 
    function myFunction() {
      main1[0].onmousemove = (e) =>{
        inputArray(e.clientX,e.clientY)
      }
    }
 
    function inputArray(x,y) {
      if(demo[0][0]==-1 && demo[0][1]==-1){
        demo[0][0] = x
        demo[0][1] = y
      }
      else if(demo[1][0]==-1 && demo[1][1]==-1){
        demo[1][0] = x
        demo[1][1] = y
      }
      else{
        demo[0][0] = demo[1][0]
        demo[0][1] = demo[1][1]
        demo[1][0] = x
        demo[1][1] = y
      }
    }

    window.requestAnimationFrame(this.process.bind(this));
  }

  checkCollision() {
    // 重置碰撞状态
    this.circles.forEach((circle) => (circle.colliding = false));
    // 使用遍历的方法计算other球的情况
    for (let i = 0; i < this.circles.length; i++) {
      for (let j = i + 1; j < this.circles.length; j++) {
        this.circles[i].checkCollideWith(this.circles[j]);
      }
    }
  }

  /**
   * 检测墙壁碰撞
   * cor为自适应指数，即为碰撞后能量消耗
   */
  checkEdgeCollision() {
    const cor = 0.8;
    this.circles.forEach((circle) => {
      // 左右墙壁碰撞
      if (circle.x < circle.r) {
        circle.vx = -circle.vx * cor;
        circle.x = circle.r;
      } else if (circle.x > width - circle.r) {
        circle.vx = -circle.vx * cor;
        circle.x = width - circle.r;
      }

      // 上下墙壁碰撞
      if (circle.y < circle.r) {
        circle.vy = -circle.vy * cor;
        circle.y = circle.r;
      } else if (circle.y > height - circle.r) {
        circle.vy = -circle.vy * cor;
        circle.y = height - circle.r;
      }
    });
  }

  process(now) {
    if (!this.startTime) {
      this.startTime = now;
    }
    let seconds = (now - this.startTime) / 1000;
    this.startTime = now;

    for (let i = 0; i < this.circles.length; i++) {
      this.circles[i].update(seconds);
    }

    this.checkEdgeCollision();
    this.checkCollision();

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.circles.length; i++) {
      this.circles[i].draw(ctx);
    }

    window.requestAnimationFrame(this.process.bind(this));
  }
}

const game = new Gameboard();
