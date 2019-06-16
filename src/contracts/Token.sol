pragma solidity ^0.5.0;
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Token {
  using SafeMath for uint;

  //variable
  string public name = "GX Token";
  string public symbol = "GX";
  uint256 public decimals = 18;
  uint256 public totalSupply;

  //Track balances (deduct one account and add to another account)
  mapping(address => uint256) public balanceOf;
  //
  mapping(address => mapping(address => uint256)) public allowance;
  //Events
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor() public {
    //every token stored in decimal
    totalSupply = 1000000 * (10 ** decimals);
    // コントラクトをdeployした人が全てのトークンを持っている
    balanceOf[msg.sender] = totalSupply;
  } 

   //Send tokens
  function transfer(address _to, uint256 _value) public returns (bool success) {
    require(balanceOf[msg.sender] >= _value);
    _transfer(msg.sender, _to, _value);
    return true;
  }

  function _transfer(address _from, address _to, uint256 _value) internal {
    require(_to != address(0));
    //送信者のバランスから引く
    balanceOf[_from] = balanceOf[_from].sub(_value);
    //受信者ののバランスにたす
    balanceOf[_to] = balanceOf[_to].add(_value);
    emit Transfer(_from , _to, _value);
  }

  //Approve function
  function approve(address _spender, uint256 _value) public returns (bool success) {
    require(_spender != address(0));
    allowance[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  //transferFrom function
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
    require(_value <= balanceOf[_from]);
    require(_value <= allowance[_from][msg.sender]);
    allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);
    _transfer(_from, _to, _value);
    return true;
  }
}