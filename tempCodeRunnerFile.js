socket.on("opponentDoJump", ({ x, y }) => {
   if (isJumping) return;
  isJumping = true;

  const jumpTargetX = e.clientX;
  const offsetX = 70;
  const jumpStartX = jumpTargetX + offsetX;

  const mouseY = e.clientY;
  const distanceFromTop = mouseY;  // 從上往下
  const jumpHeight = Math.min(distanceFromTop, 750);


  console.log("從上而降！");

  // 移到起始點（畫面上方）
  img2.style.transition = "none";
  img2.style.left = `${jumpStartX}px`;
  img2.style.transform = `translate(-50%, -${jumpHeight}px)`; // 先高高在上

  requestAnimationFrame(() => {
    // 第一步：降落到底部（滑鼠點附近）
    img2.style.transition = "transform 0.17s ease-out, left 0.17s ease-out";
    img2.style.left = `${jumpTargetX}px`;
    img2.style.transform = `translate(-50%, 0px)`;

    setTimeout(() => {
      // 第二步：反彈一下（微微往上）
      img2.style.transition = "transform 0.07s ease";
      img2.style.transform = `translate(-55%, -80px)`;

      setTimeout(() => {
        // ⭐ 停頓一會兒
        setTimeout(() => {
          // 第三步：飛回上方原位
          img2.style.transition = "transform 0.17s ease-in, left 0.17s ease-in";
          img2.style.left = `${jumpStartX}px`;
          img2.style.transform = `translate(-50%, -${jumpHeight}px)`;

          setTimeout(() => {
            isJumping = false;
          }, 170);
        }, 150);
      }, 70);
    }, 170);
  });
});