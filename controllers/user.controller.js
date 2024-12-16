const User = require("../models/user.model");
const ForgotPassword = require("../models/forgot-password.model");
const md5 = require("md5");

const generateHelper = require("../helpers/generate.helper");
const sendMailHelper = require("../helpers/sendMail.helper");

module.exports.register = async (req, res) => {
  res.render("pages/user/register", {
    pageTitle: "Đăng ký tài khoản",
  });
};

module.exports.registerPost = async (req, res) => {
  const user = req.body;
  const existUser = await User.findOne({
    email: user.email,
    deleted: false
  });

  if (existUser) {
    req.flash("error", "Email đã tồn tại trong hệ thống!");
    res.redirect("back");
    return;
  }

  const dataUser = {
    fullName: user.fullName,
    email: user.email,
    password: md5(user.password),
    token: generateHelper.generateRandomString(30),
    status: "active"
  };

  const newUser = new User(dataUser);
  await newUser.save();

  res.cookie("tokenUser", newUser.token);
  req.flash("success", "Đăng ký tài khoản thành công!");

  res.redirect("/");
};


module.exports.login = async (req, res) => {
  res.render("pages/user/login", {
    pageTitle: "Đăng nhập tài khoản",
  });
};

module.exports.loginPost = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const existUser = await User.findOne({
    email: email,
    deleted: false
  });

  if (!existUser) {
    req.flash("error", "Email không tồn tại trong hệ thống!");
    res.redirect("back");
    return;
  }

  if (md5(password) != existUser.password) {
    req.flash("error", "Sai mật khẩu!");
    res.redirect("back");
    return;
  }

  if (existUser.status != "active") {
    req.flash("error", "Tài khoản đang bị khóa!");
    res.redirect("back");
    return;
  }

  res.cookie("tokenUser", existUser.token);
  req.flash("success", "Đăng nhập thành công!");

  res.redirect("/");
};


module.exports.logout = async (req, res) => {
  res.clearCookie("tokenUser");
  req.flash("success", "Đã đăng xuất!");
  res.redirect("/");
};


module.exports.forgotPassword = async (req, res) => {
  res.render("pages/user/forgot-password", {
    pageTitle: "Lấy lại mật khẩu",
  });
};

module.exports.forgotPasswordPost = async (req, res) => {
  const email = req.body.email;
  const existUser = await User.findOne({
    email: email,
    status: "active",
    deleted: false
  });

  if (!existUser) {
    req.flash("error", "Email không tồn tại!");
    res.redirect("back");
    return;
  }

  // Việc 1: Lưu email và mã OTP vào database
  const existEmailInForgotPassword = await ForgotPassword.findOne({
    email: email
  });

  if (!existEmailInForgotPassword) {
    const otp = generateHelper.generateRandomNumber(6);
    const data = {
      email: email,
      otp: otp,
      expireAt: Date.now() + 5 * 60 * 1000
    };

    const record = new ForgotPassword(data);
    await record.save();

    // Việc 2: Gửi mã OTP qua email cho user
    const subject = "Xác thực mã OTP";
    const text = `Mã xác thực của bạn là <b>${otp}</b>. Mã OTP có hiệu lực trong vòng 5 phút, vui lòng không cung cấp mã OTP cho bất kỳ ai.`;
    sendMailHelper.sendMail(email, subject, text);
  }

  res.redirect(`/user/password/otp?email=${email}`);
};


module.exports.otpPassword = async (req, res) => {
  const email = req.query.email;

  res.render("pages/user/otp-password", {
    pageTitle: "Xác thực OTP",
    email: email
  });
};

module.exports.otpPasswordPost = async (req, res) => {
  const email = req.body.email;
  const otp = req.body.otp;

  const existRecord = await ForgotPassword.findOne({
    email: email,
    otp: otp
  });

  if (!existRecord) {
    req.flash("error", "Mã OTP không hợp lệ!");
    res.redirect("back");
    return;
  }

  const user = await User.findOne({
    email: email
  });

  res.cookie("tokenUser", user.token);
  res.redirect("/user/password/reset");
};


module.exports.resetPassword = async (req, res) => {
  res.render("pages/user/reset-password", {
    pageTitle: "Đổi mật khẩu"
  });
};

module.exports.resetPasswordPost = async (req, res) => {
  const password = req.body.password;
  const tokenUser = req.cookies.tokenUser;

  await User.updateOne({
    token: tokenUser,
    status: "active",
    deleted: false
  }, {
    password: md5(password)
  });

  req.flash("success", "Đổi mật khẩu thành công!");
  res.redirect("/");
};

module.exports.profile = async (req, res) => {
  res.render("pages/user/profile", {
    pageTitle: "Thông tin tài khoản",
  });
};


module.exports.notFriend = async (req, res) => {
  const userIdA = res.locals.user.id;

  _io.once("connection", (socket) => {
    // Khi A gửi yêu cầu cho B
    socket.on("CLIENT_ADD_FRIEND", async (userIdB) => {
      // Thêm Id của A vào acceptFriends của B
      const existAInB = await User.findOne({
        _id: userIdB,
        acceptFriends: userIdA
      });

      if(!existAInB) {
        await User.updateOne({
          _id: userIdB
        }, {
          $push: { acceptFriends: userIdA }
        });
      }

      // Thêm id của B vào requestFriend của A 
      const existBInA  = await User.findOne({
        _id: userIdA, 
        requestFriends: userIdB
      });

      if (!existBInA) {
        await User.updateOne({
          _id: userIdA
        }, {
          $push: {requestFriends: userIdB}
        });
      }

      // Trả về cho B số lượng user cần chấp nhận
      const userB = await User.findOne({
        _id: userIdB,
        deleted: false,
        status: "active"
      });

      _io.emit("SERVER_RETURN_LENGTH_ACCEPT_FRIENDS", {
        userIdB: userIdB,
        length: userB.acceptFriends.length
      }) 
    });
  });

  const friendsList = res.locals.user.friendsList;
  const friendsListId = friendsList.map(item => item.userId);  

  const users = await User.find({
      $and: [
        {_id: { $ne: userIdA }},
        { _id: { $nin: res.locals.user.requestFriends } },
        { _id: { $nin: res.locals.user.acceptFriends } },
        { _id: { $nin: friendsListId } }
      ],
      deleted: false,
      status: "active"
  }).select("id fullName avatar");


  res.render("pages/user/not-friend", {
      pageTitle: "Danh sách người dùng",
      users: users
  });

}


module.exports.request = async (req, res) => { 
  const userIdA = res.locals.user.id;
  // Khi A huỷ gửi yêu cầu cho B

  _io.once("connection", (socket) => {
    socket.on("CLIENT_CANCEL_FRIEND", async (userIdB) => {
      // Xoá Id của A trong accept friend của B
      const existAInB = await User.findOne({
        _id: userIdB,
        acceptFriends: userIdA
      });

      if(existAInB) {
        await User.updateOne({
          _id: userIdB
        }, {
          $pull: { acceptFriends: userIdA }
        });
      }

      // Xoá Id của B trong requestFriends của A 
      const existBInA = await User.findOne({
        _id: userIdA,
        requestFriends: userIdB
      });

      if(existBInA) {
        await User.updateOne({
          _id: userIdA
        }, {
          $pull: { requestFriends: userIdB }
        });
      }
    })
  })

  const users = await User.find({
    _id: { $in: res.locals.user.requestFriends },
    deleted: false,
    status: "active"
  }).select("id fullName avatar");

  res.render("pages/user/request", {
    pageTitle: "Lời mời đã gửi",
    users: users
  });
}

module.exports.accept = async (req, res) => { 
  const userIdA = res.locals.user.id;

  _io.once("connection", (socket) => {
    // Khi A từ chối kết bạn của B 
    socket.on("CLIENT_REFUSE_FRIEND", async (userIdB) => {
      // Xoá B ra khỏi acceptFriends của A 
      const existBInA = await User.findOne({
        _id: userIdA,
        acceptFriends: userIdB
      });

      if(existBInA) {
        await User.updateOne({
          _id: userIdA
        }, {
          $pull: { acceptFriends: userIdB }
        });
      }

      // Xoá id của A ra khỏi requestFriends của B 
      const existAInB = await User.findOne({
        _id: userIdB,
        requestFriends: userIdA
      });

      if(existAInB){
        await User.updateOne({
          _id: userIdB
        }, {
          $pull: { requestFriends: userIdA }
        });
      }
    });

    // Khi A chấp nhận lời mời kết bạn của B 
    socket.on("CLIENT_ACCEPT_FRIEND", async (userIdB) => {
      // Thêm {userId, roomChatId} của B vào friendsList của A
      // Xóa id của B trong acceptFriends của A
      const existBInA = await User.findOne({
        _id: userIdA,
        acceptFriends: userIdB
      });

      if(existBInA) {
        await User.updateOne({
          _id: userIdA
        }, {
          $pull: { acceptFriends: userIdB },
          $push: {
            friendsList: {
              userId: userIdB,
              roomChatId: ""
            }
          }
        });
      }

      // Thêm {userId, roomChatId} của A vào friendsList của B
      // Xóa id của A trong requestFriends của B
      const existAInB = await User.findOne({
        _id: userIdB,
        requestFriends: userIdA
      });

      if(existAInB) {
        await User.updateOne({
          _id: userIdB
        }, {
          $pull: { requestFriends: userIdA },
          $push: {
            friendsList: {
              userId: userIdA,
              roomChatId: ""
            }
          }
        });
      }
    })
  });

  const users = await User.find({
    _id: { $in: res.locals.user.acceptFriends }, 
    deleted: false,
    status: "active"
  }).select("id fullName avatar");

  res.render("pages/user/accept", {
    pageTitle: "Lời mời đã nhận",
    users: users
  });
};

module.exports.friends = async (req, res) => {
  const friendsList = res.locals.user.friendsList;
  const friendsListId = friendsList.map((item) => item.userId)

  const users = await User.find({
    _id: { $in: friendsListId },
    deleted: false,
    status: "active"
  }).select("id fullName avatar");

  res.render("pages/user/friends", {
    pageTitle: "Danh sách bạn bè",
    users: users
  });
}