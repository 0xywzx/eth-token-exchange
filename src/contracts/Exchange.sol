pragma solidity ^0.5.0;

import "./Token.sol";

contract Exchange {
  using SafeMath for uint256;

  //Variable
  address public feeAccount; //the account that receives exchange fees
  uint256 public feePersent; //the fee percent
  address constant ETHER = address(0); //store Ether token in tokens mapping blanck address
  // First key is token addres and second key is the user address who deposited token 
  mapping(address => mapping(address => uint256)) public tokens;
  //model the order
  mapping(uint256 => _Order) public orders;
  uint256 public orderCount;
  //manage cancel order
  mapping(uint256 => bool) public orderCancelled;
  mapping(uint256 => bool) public orderFilled;

  //Event
  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);
  event Order(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
  event Cancel(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
  event Trade(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, address userFill, uint256 timestamp);

  //Struct
  struct _Order {
    uint256 id;
    address user;
    address tokenGet;
    uint256 amountGet;
    address tokenGive;
    uint256 amountGive;
    uint256 timestamp;
  }

  constructor (address _feeAccount, uint256 _feePersent) public {
    feeAccount = _feeAccount;
    feePersent = _feePersent;
  }

  // Fallbacl: reverts if ether is sent to this smart contract by mistake
  function() external {
    revert();
  }

  function depositEther() payable public {
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
    emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]); 
  }

  function withdrawEther(uint256 _amount) public {
    require(tokens[ETHER][msg.sender] >= _amount);
    tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
    // get back ether to the sender 
    msg.sender.transfer(_amount);
    emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
  }

  function depositToken(address _token, uint256 _amount) public {
    // Which token ? (コントラクトのアドレスでどのTokenか確認（ERC20に限る）)
    // How much?
    // Send token to this account
    // Magage deposit - update balance
    // Emit event
    require(_token != ETHER); // Don't allow ether deposit
    require(Token(_token).transferFrom(msg.sender, address(this), _amount)); //Token(_token)はTokenのコントラクトを呼ぶインスタンス
    tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
    emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]); 
  }

  function withdrawToken(address _token, uint256 _amount) public {
    //TOkenがETHでないことの確認
    require(_token != ETHER);
    require(tokens[_token][msg.sender] >= _amount);
    tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
    require(Token(_token).transfer(msg.sender, _amount));
    emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]); 
  }

  function balanceOf(address _token, address _user) public view returns (uint256) {
    return tokens[_token][_user];
  }

  function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
    orderCount = orderCount.add(1);
    orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);  
  }

  function cancelOrder(uint256 _id) public {
    //Must be "my" order and vaild order
    _Order storage _order = orders[_id]; // fetch _Order from storage
    require(address(_order.user) == msg.sender);
    require(_order.id == _id);
    orderCancelled[_id] = true;
    emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);
  }

  function fillOrder(uint256 _id) public {
    //order id is valid
    require(_id > 0 && _id <= orderCount);
    //order shouldn't be filled before (show it by bool)
    require(!orderFilled[_id]);
    require(!orderCancelled[_id]);
    _Order storage _order = orders[_id]; //Fetch the order
    _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
    //Mark Order as filled
    orderFilled[_order.id] = true;
  }

  function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
    //Fee paid by the user that fills order
    //Fee decucted from _amountGet
    uint256 _feeAmount = _amountGive.mul(feePersent).div(100);

    //Excute trade //swapping balances
    tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
    tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
    tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
    tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);

    //Charge Fee 
    tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount); 
    //Emit trade event
    emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, now);
  }
}